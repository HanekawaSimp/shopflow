import psycopg2
from psycopg2.extras import RealDictCursor
from config import config


def get_connection():
    """Get a new database connection."""
    return psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        cursor_factory=RealDictCursor,
    )


def initialize_database():
    """Create tables and indexes if they don't exist."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    sku VARCHAR(100) UNIQUE NOT NULL,
                    name VARCHAR(500) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
                    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
                    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                    image_url TEXT,
                    is_active BOOLEAN DEFAULT true,
                    weight_kg DECIMAL(8, 3),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
                CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
                CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
                CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
            """)
            conn.commit()
        print("[DB] Tables and indexes initialized successfully")
    except Exception as e:
        conn.rollback()
        print(f"[DB] Initialization error: {e}")
        raise
    finally:
        conn.close()


def check_connection():
    """Check database connectivity for health checks."""
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT NOW()")
            result = cur.fetchone()
        conn.close()
        return {"connected": True, "timestamp": str(result["now"])}
    except Exception as e:
        return {"connected": False, "error": str(e)}
