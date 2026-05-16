import sys
import signal
from flask import Flask, jsonify
from config import config
from models import initialize_database, check_connection
from events import check_redis
from routes import products_bp, categories_bp

app = Flask(__name__)
app.json.sort_keys = False


# Register blueprints
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(categories_bp, url_prefix='/api/categories')


@app.route('/api/health')
def health_check():
    """Health check endpoint."""
    db_status = check_connection()
    redis_status = check_redis()
    healthy = db_status.get('connected', False)

    return jsonify({
        "service": "product-service",
        "status": "healthy" if healthy else "unhealthy",
        "version": "1.0.0",
        "checks": {
            "database": db_status,
            "redis": redis_status,
        }
    }), 200 if healthy else 503


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "NOT_FOUND", "message": "Route not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "INTERNAL_ERROR", "message": "An unexpected error occurred"}), 500


def handle_shutdown(signum, frame):
    print(f"\n[PRODUCTS] Received signal {signum}, shutting down...")
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


if __name__ == '__main__':
    print("[PRODUCTS] Initializing database...")
    initialize_database()
    print(f"[PRODUCTS] Starting on port {config.PORT}")
    app.run(host='0.0.0.0', port=config.PORT, debug=False)
