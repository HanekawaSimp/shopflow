import os


class Config:
    PORT = int(os.environ.get('PORT', 3004))
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # Channels to subscribe to
    SUBSCRIBE_CHANNELS = [
        'shopflow.orders',
        'shopflow.products',
    ]

    # Webhook URL for external notifications (e.g., Slack)
    WEBHOOK_URL = os.environ.get('WEBHOOK_URL', '')

    # SMTP config (for email notifications in production)
    SMTP_HOST = os.environ.get('SMTP_HOST', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_FROM = os.environ.get('SMTP_FROM', 'noreply@shopflow.io')

    # Log directory for notification records
    LOG_DIR = os.environ.get('LOG_DIR', '/tmp/shopflow-notifications')


config = Config()
