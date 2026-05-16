from flask import Blueprint, request, jsonify, g
from models import get_connection
from auth import require_auth, require_role
from events import publish_event
from config import config
import math

products_bp = Blueprint('products', __name__)
categories_bp = Blueprint('categories', __name__)


# ──────────────────── CATEGORIES ────────────────────

@categories_bp.route('', methods=['GET'])
def list_categories():
    """List all product categories."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.*, COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
                GROUP BY c.id
                ORDER BY c.name
            """)
            categories = cur.fetchall()
        return jsonify({"categories": categories})
    finally:
        conn.close()


@categories_bp.route('', methods=['POST'])
@require_auth
@require_role('admin', 'manager')
def create_category():
    """Create a new category."""
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"error": "VALIDATION_ERROR", "message": "Category name is required"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO categories (name, description) VALUES (%s, %s) RETURNING *",
                (data['name'], data.get('description', ''))
            )
            category = cur.fetchone()
            conn.commit()
        print(f"[PRODUCTS] Category created: {category['name']}")
        return jsonify({"message": "Category created", "category": category}), 201
    except Exception as e:
        conn.rollback()
        if 'unique' in str(e).lower():
            return jsonify({"error": "CONFLICT", "message": "Category already exists"}), 409
        raise
    finally:
        conn.close()


# ──────────────────── PRODUCTS ────────────────────

@products_bp.route('', methods=['GET'])
def list_products():
    """List products with filtering, sorting, and pagination."""
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 20)), 100)
    offset = (page - 1) * limit
    category_id = request.args.get('category_id')
    search = request.args.get('search')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    active_only = request.args.get('active_only', 'true').lower() == 'true'

    # Validate sort field
    allowed_sorts = ['name', 'price', 'stock_quantity', 'created_at', 'updated_at']
    if sort_by not in allowed_sorts:
        sort_by = 'created_at'
    if sort_order not in ('asc', 'desc'):
        sort_order = 'desc'

    conn = get_connection()
    try:
        conditions = []
        params = []

        if active_only:
            conditions.append("p.is_active = true")

        if category_id:
            conditions.append("p.category_id = %s")
            params.append(int(category_id))

        if search:
            conditions.append("(p.name ILIKE %s OR p.description ILIKE %s OR p.sku ILIKE %s)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        with conn.cursor() as cur:
            # Get total count
            cur.execute(f"SELECT COUNT(*) as total FROM products p {where_clause}", params)
            total = cur.fetchone()['total']

            # Get products
            cur.execute(f"""
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                {where_clause}
                ORDER BY p.{sort_by} {sort_order}
                LIMIT %s OFFSET %s
            """, params + [limit, offset])
            products = cur.fetchall()

        # Convert Decimal to float for JSON serialization
        for product in products:
            if product.get('price'):
                product['price'] = float(product['price'])
            if product.get('weight_kg'):
                product['weight_kg'] = float(product['weight_kg'])

        return jsonify({
            "products": products,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": math.ceil(total / limit) if limit > 0 else 0,
            }
        })
    finally:
        conn.close()


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get a single product by ID."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = %s
            """, (product_id,))
            product = cur.fetchone()

        if not product:
            return jsonify({"error": "NOT_FOUND", "message": "Product not found"}), 404

        if product.get('price'):
            product['price'] = float(product['price'])
        if product.get('weight_kg'):
            product['weight_kg'] = float(product['weight_kg'])

        return jsonify({"product": product})
    finally:
        conn.close()


@products_bp.route('/sku/<sku>', methods=['GET'])
def get_product_by_sku(sku):
    """Get a product by SKU."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.sku = %s
            """, (sku,))
            product = cur.fetchone()

        if not product:
            return jsonify({"error": "NOT_FOUND", "message": "Product not found"}), 404

        if product.get('price'):
            product['price'] = float(product['price'])
        if product.get('weight_kg'):
            product['weight_kg'] = float(product['weight_kg'])

        return jsonify({"product": product})
    finally:
        conn.close()


@products_bp.route('', methods=['POST'])
@require_auth
@require_role('admin', 'manager')
def create_product():
    """Create a new product."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "VALIDATION_ERROR", "message": "Request body required"}), 400

    required = ['sku', 'name', 'price']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": "VALIDATION_ERROR", "message": f"Missing fields: {', '.join(missing)}"}), 400

    if float(data['price']) < 0:
        return jsonify({"error": "VALIDATION_ERROR", "message": "Price cannot be negative"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO products (sku, name, description, price, stock_quantity, category_id, image_url, weight_kg)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data['sku'],
                data['name'],
                data.get('description', ''),
                float(data['price']),
                int(data.get('stock_quantity', 0)),
                data.get('category_id'),
                data.get('image_url'),
                data.get('weight_kg'),
            ))
            product = cur.fetchone()
            conn.commit()

        if product.get('price'):
            product['price'] = float(product['price'])

        print(f"[PRODUCTS] Created: {product['sku']} - {product['name']}")
        return jsonify({"message": "Product created", "product": product}), 201

    except Exception as e:
        conn.rollback()
        if 'unique' in str(e).lower():
            return jsonify({"error": "CONFLICT", "message": "A product with this SKU already exists"}), 409
        print(f"[PRODUCTS] Create error: {e}")
        return jsonify({"error": "INTERNAL_ERROR", "message": "Failed to create product"}), 500
    finally:
        conn.close()


@products_bp.route('/<int:product_id>', methods=['PUT'])
@require_auth
@require_role('admin', 'manager')
def update_product(product_id):
    """Update an existing product."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "VALIDATION_ERROR", "message": "Request body required"}), 400

    conn = get_connection()
    try:
        # Check product exists
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
            existing = cur.fetchone()

        if not existing:
            return jsonify({"error": "NOT_FOUND", "message": "Product not found"}), 404

        fields = []
        values = []
        for field in ['name', 'description', 'image_url']:
            if field in data:
                fields.append(f"{field} = %s")
                values.append(data[field])

        if 'price' in data:
            if float(data['price']) < 0:
                return jsonify({"error": "VALIDATION_ERROR", "message": "Price cannot be negative"}), 400
            fields.append("price = %s")
            values.append(float(data['price']))

        if 'stock_quantity' in data:
            new_stock = int(data['stock_quantity'])
            if new_stock < 0:
                return jsonify({"error": "VALIDATION_ERROR", "message": "Stock cannot be negative"}), 400
            fields.append("stock_quantity = %s")
            values.append(new_stock)

        if 'category_id' in data:
            fields.append("category_id = %s")
            values.append(data['category_id'])

        if 'is_active' in data:
            fields.append("is_active = %s")
            values.append(bool(data['is_active']))

        if 'weight_kg' in data:
            fields.append("weight_kg = %s")
            values.append(data['weight_kg'])

        if not fields:
            return jsonify({"error": "VALIDATION_ERROR", "message": "No fields to update"}), 400

        fields.append("updated_at = CURRENT_TIMESTAMP")
        values.append(product_id)

        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE products SET {', '.join(fields)} WHERE id = %s RETURNING *",
                values
            )
            product = cur.fetchone()
            conn.commit()

        if product.get('price'):
            product['price'] = float(product['price'])
        if product.get('weight_kg'):
            product['weight_kg'] = float(product['weight_kg'])

        # Check for low stock and publish event
        if product['stock_quantity'] <= config.LOW_STOCK_THRESHOLD and product['is_active']:
            publish_event('shopflow.products', 'product.low_stock', {
                "product_id": product['id'],
                "sku": product['sku'],
                "name": product['name'],
                "stock_quantity": product['stock_quantity'],
                "threshold": config.LOW_STOCK_THRESHOLD,
            })

        print(f"[PRODUCTS] Updated: {product['sku']}")
        return jsonify({"message": "Product updated", "product": product})

    except Exception as e:
        conn.rollback()
        print(f"[PRODUCTS] Update error: {e}")
        return jsonify({"error": "INTERNAL_ERROR", "message": "Failed to update product"}), 500
    finally:
        conn.close()


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@require_auth
@require_role('admin')
def delete_product(product_id):
    """Soft-delete a product (set is_active to false)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id, sku, name",
                (product_id,)
            )
            product = cur.fetchone()
            conn.commit()

        if not product:
            return jsonify({"error": "NOT_FOUND", "message": "Product not found"}), 404

        print(f"[PRODUCTS] Deactivated: {product['sku']}")
        return jsonify({"message": "Product deactivated", "product": product})
    finally:
        conn.close()


@products_bp.route('/<int:product_id>/stock', methods=['PATCH'])
@require_auth
@require_role('admin', 'manager')
def update_stock(product_id):
    """Update product stock quantity. Accepts {"adjustment": 5} or {"adjustment": -3}."""
    data = request.get_json()
    if not data or 'adjustment' not in data:
        return jsonify({"error": "VALIDATION_ERROR", "message": "Stock adjustment value required"}), 400

    adjustment = int(data['adjustment'])

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE products 
                   SET stock_quantity = stock_quantity + %s, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = %s AND stock_quantity + %s >= 0
                   RETURNING *""",
                (adjustment, product_id, adjustment)
            )
            product = cur.fetchone()
            conn.commit()

        if not product:
            return jsonify({"error": "BAD_REQUEST", "message": "Product not found or insufficient stock"}), 400

        if product.get('price'):
            product['price'] = float(product['price'])

        # Publish low stock event if below threshold
        if product['stock_quantity'] <= config.LOW_STOCK_THRESHOLD and product['is_active']:
            publish_event('shopflow.products', 'product.low_stock', {
                "product_id": product['id'],
                "sku": product['sku'],
                "name": product['name'],
                "stock_quantity": product['stock_quantity'],
                "threshold": config.LOW_STOCK_THRESHOLD,
            })

        print(f"[PRODUCTS] Stock updated: {product['sku']} -> {product['stock_quantity']}")
        return jsonify({"message": "Stock updated", "product": product})
    finally:
        conn.close()
