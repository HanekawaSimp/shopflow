"""Event handlers for different notification types."""
import json
import os
from datetime import datetime
from config import config


def ensure_log_dir():
    """Create notification log directory if it doesn't exist."""
    os.makedirs(config.LOG_DIR, exist_ok=True)


def log_notification(notification_type, data):
    """Write notification to log file for auditing."""
    ensure_log_dir()
    log_file = os.path.join(config.LOG_DIR, f"{datetime.now().strftime('%Y-%m-%d')}.jsonl")
    entry = {
        "timestamp": datetime.now().isoformat(),
        "type": notification_type,
        "data": data,
    }
    with open(log_file, 'a') as f:
        f.write(json.dumps(entry) + '\n')


def handle_order_created(data):
    """Handle new order events — send confirmation notification."""
    order_number = data.get('order_number', 'Unknown')
    user_email = data.get('user_email', 'Unknown')
    total = data.get('total', 0)
    item_count = data.get('item_count', 0)
    items = data.get('items', [])

    items_summary = '\n'.join([
        f"    - {item['name']} x{item['quantity']} @ ${item['price']}"
        for item in items
    ])

    print(f"""
╔══════════════════════════════════════════════════════╗
║  📦 NEW ORDER NOTIFICATION                          ║
╠══════════════════════════════════════════════════════╣
║  Order:    {order_number:<41}║
║  Customer: {user_email:<41}║
║  Items:    {item_count:<41}║
║  Total:    ${total:<40}║
╚══════════════════════════════════════════════════════╝
Items:
{items_summary}
""")

    log_notification('order_created', {
        'order_number': order_number,
        'user_email': user_email,
        'total': total,
        'item_count': item_count,
    })

    # In production, this would:
    # 1. Send confirmation email to customer
    # 2. Send Slack notification to #orders channel
    # 3. Update analytics/metrics

    return True


def handle_order_status_changed(data):
    """Handle order status change events."""
    order_number = data.get('order_number', 'Unknown')
    user_email = data.get('user_email', 'Unknown')
    from_status = data.get('from_status', 'Unknown')
    to_status = data.get('to_status', 'Unknown')
    reason = data.get('reason', '')

    status_emoji = {
        'confirmed': '✅',
        'processing': '⚙️',
        'shipped': '🚚',
        'delivered': '📬',
        'cancelled': '❌',
        'refunded': '💰',
    }

    emoji = status_emoji.get(to_status, '📋')

    print(f"""
{emoji} ORDER STATUS CHANGE
   Order:  {order_number}
   Email:  {user_email}
   Change: {from_status} → {to_status}
   Reason: {reason or 'N/A'}
""")

    log_notification('order_status_changed', {
        'order_number': order_number,
        'user_email': user_email,
        'from_status': from_status,
        'to_status': to_status,
        'reason': reason,
    })

    # In production, this would:
    # 1. Send email to customer with tracking info (if shipped)
    # 2. Send Slack notification for cancellations
    # 3. Trigger refund process (if refunded)

    return True


def handle_low_stock(data):
    """Handle low stock alert events."""
    product_name = data.get('name', 'Unknown')
    sku = data.get('sku', 'Unknown')
    stock = data.get('stock_quantity', 0)
    threshold = data.get('threshold', 10)

    print(f"""
⚠️  LOW STOCK ALERT
   Product:   {product_name}
   SKU:       {sku}
   Stock:     {stock} (threshold: {threshold})
   Action:    Reorder recommended
""")

    log_notification('low_stock_alert', {
        'product_name': product_name,
        'sku': sku,
        'stock_quantity': stock,
        'threshold': threshold,
    })

    # In production, this would:
    # 1. Send urgent Slack notification to #inventory
    # 2. Create a purchase order in procurement system
    # 3. Email warehouse manager

    return True


# Map event types to handlers
EVENT_HANDLERS = {
    'order.created': handle_order_created,
    'order.status_changed': handle_order_status_changed,
    'product.low_stock': handle_low_stock,
}


def process_event(event_type, data):
    """Route an event to the appropriate handler."""
    handler = EVENT_HANDLERS.get(event_type)
    if handler:
        try:
            return handler(data)
        except Exception as e:
            print(f"[ERROR] Handler failed for {event_type}: {e}")
            log_notification('handler_error', {
                'event_type': event_type,
                'error': str(e),
            })
            return False
    else:
        print(f"[WARN] No handler for event type: {event_type}")
        return False
