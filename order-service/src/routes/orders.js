const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { publishEvent } = require('../redis');
const config = require('../config');

const router = express.Router();

// Valid status transitions
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const TAX_RATE = 0.08; // 8% tax
const SHIPPING_THRESHOLD = 50; // Free shipping over $50
const SHIPPING_COST = 9.99;

// ──────────── CREATE ORDER ────────────

router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const { items, shipping_address, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Order must contain at least one item' });
    }

    if (!shipping_address || !shipping_address.street || !shipping_address.city || !shipping_address.country) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Shipping address with street, city, and country is required',
      });
    }

    // Validate products and check stock via product service
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Invalid item: product_id and quantity (>=1) required`,
        });
      }

      try {
        const productRes = await axios.get(
          `${config.services.productUrl}/api/products/${item.product_id}`,
          { timeout: 5000 }
        );
        const product = productRes.data.product;

        if (!product.is_active) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: `Product "${product.name}" is no longer available`,
          });
        }

        if (product.stock_quantity < item.quantity) {
          return res.status(400).json({
            error: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}`,
          });
        }

        const totalPrice = product.price * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          product_id: product.id,
          product_sku: product.sku,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: product.price,
          total_price: totalPrice,
        });
      } catch (err) {
        if (err.response && err.response.status === 404) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: `Product with ID ${item.product_id} not found`,
          });
        }
        if (err.code === 'ECONNREFUSED') {
          return res.status(503).json({
            error: 'SERVICE_UNAVAILABLE',
            message: 'Product service is unreachable',
          });
        }
        throw err;
      }
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = Math.round((subtotal + tax + shippingCost) * 100) / 100;
    const orderNumber = `ORD-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;

    // Begin transaction
    await client.query('BEGIN');

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, user_email, subtotal, tax, shipping_cost, total, shipping_address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orderNumber, req.user.id, req.user.email, subtotal, tax, shippingCost, total,
       JSON.stringify(shipping_address), notes || null]
    );
    const order = orderResult.rows[0];

    // Insert order items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_sku, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.product_id, item.product_sku, item.product_name, item.quantity, item.unit_price, item.total_price]
      );
    }

    // Record initial status
    await client.query(
      `INSERT INTO order_status_history (order_id, to_status, changed_by)
       VALUES ($1, 'pending', $2)`,
      [order.id, req.user.id]
    );

    await client.query('COMMIT');

    // Deduct stock via product service (fire-and-forget, best effort)
    for (const item of orderItems) {
      try {
        await axios.patch(
          `${config.services.productUrl}/api/products/${item.product_id}/stock`,
          { adjustment: -item.quantity },
          {
            headers: { Authorization: req.headers.authorization },
            timeout: 5000,
          }
        );
      } catch (err) {
        console.warn(`[ORDERS] Failed to deduct stock for product ${item.product_id}:`, err.message);
      }
    }

    // Publish order event
    await publishEvent('shopflow.orders', 'order.created', {
      order_id: order.id,
      order_number: order.order_number,
      user_email: order.user_email,
      total: parseFloat(order.total),
      item_count: orderItems.length,
      items: orderItems.map(i => ({ name: i.product_name, quantity: i.quantity, price: i.unit_price })),
    });

    console.log(`[ORDERS] Created: ${orderNumber} by ${req.user.email} — $${total}`);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...order,
        subtotal: parseFloat(order.subtotal),
        tax: parseFloat(order.tax),
        shipping_cost: parseFloat(order.shipping_cost),
        total: parseFloat(order.total),
        items: orderItems,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ORDERS] Create error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// ──────────── LIST ORDERS ────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let conditions = [];
    let params = [];

    // Regular users can only see their own orders
    if (req.user.role === 'user') {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const orders = result.rows.map(o => ({
      ...o,
      subtotal: parseFloat(o.subtotal),
      tax: parseFloat(o.tax),
      shipping_cost: parseFloat(o.shipping_cost),
      total: parseFloat(o.total),
    }));

    res.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[ORDERS] List error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to list orders' });
  }
});

// ──────────── GET ORDER BY ID ────────────

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Regular users can only see their own orders
    if (req.user.role === 'user' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    const historyResult = await pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [orderId]
    );

    res.json({
      order: {
        ...order,
        subtotal: parseFloat(order.subtotal),
        tax: parseFloat(order.tax),
        shipping_cost: parseFloat(order.shipping_cost),
        total: parseFloat(order.total),
        items: itemsResult.rows.map(i => ({
          ...i,
          unit_price: parseFloat(i.unit_price),
          total_price: parseFloat(i.total_price),
        })),
        status_history: historyResult.rows,
      },
    });
  } catch (err) {
    console.error('[ORDERS] Get error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get order' });
  }
});

// ──────────── UPDATE ORDER STATUS ────────────

router.patch('/:id/status', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status: newStatus, reason } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'New status is required' });
    }

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from "${order.status}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, order.status, newStatus, req.user.id, reason || null]
    );

    await client.query('COMMIT');

    // If cancelled, try to restore stock
    if (newStatus === 'cancelled') {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
      for (const item of items.rows) {
        try {
          await axios.patch(
            `${config.services.productUrl}/api/products/${item.product_id}/stock`,
            { adjustment: item.quantity },
            {
              headers: { Authorization: req.headers.authorization },
              timeout: 5000,
            }
          );
        } catch (err) {
          console.warn(`[ORDERS] Failed to restore stock for product ${item.product_id}:`, err.message);
        }
      }
    }

    // Publish status change event
    await publishEvent('shopflow.orders', 'order.status_changed', {
      order_id: order.id,
      order_number: order.order_number,
      user_email: order.user_email,
      from_status: order.status,
      to_status: newStatus,
      reason: reason || null,
    });

    console.log(`[ORDERS] Status updated: ${order.order_number} ${order.status} → ${newStatus}`);

    res.json({
      message: 'Order status updated',
      order: {
        id: order.id,
        order_number: order.order_number,
        previous_status: order.status,
        new_status: newStatus,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ORDERS] Status update error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update order status' });
  } finally {
    client.release();
  }
});

// ──────────── ORDER STATS ────────────

router.get('/stats/summary', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded,
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as total_revenue,
        COALESCE(AVG(total) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0) as avg_order_value,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as orders_last_24h
      FROM orders
    `);

    const stats = result.rows[0];
    res.json({
      stats: {
        total_orders: parseInt(stats.total_orders),
        by_status: {
          pending: parseInt(stats.pending),
          confirmed: parseInt(stats.confirmed),
          processing: parseInt(stats.processing),
          shipped: parseInt(stats.shipped),
          delivered: parseInt(stats.delivered),
          cancelled: parseInt(stats.cancelled),
          refunded: parseInt(stats.refunded),
        },
        total_revenue: parseFloat(stats.total_revenue),
        avg_order_value: parseFloat(parseFloat(stats.avg_order_value).toFixed(2)),
        orders_last_24h: parseInt(stats.orders_last_24h),
      },
    });
  } catch (err) {
    console.error('[ORDERS] Stats error:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get stats' });
  }
});

module.exports = router;
