"""Seed script to populate the product database with sample data."""
from models import get_connection, initialize_database


CATEGORIES = [
    {"name": "Electronics", "description": "Phones, laptops, tablets and accessories"},
    {"name": "Clothing", "description": "Men's and women's apparel"},
    {"name": "Home & Kitchen", "description": "Furniture, appliances, and home goods"},
    {"name": "Books", "description": "Physical and digital books"},
    {"name": "Sports & Outdoors", "description": "Athletic gear and outdoor equipment"},
]

PRODUCTS = [
    {"sku": "ELEC-001", "name": "Wireless Bluetooth Headphones", "description": "Premium noise-cancelling over-ear headphones with 30hr battery", "price": 149.99, "stock": 85, "category": "Electronics", "weight": 0.32},
    {"sku": "ELEC-002", "name": "USB-C Fast Charger 65W", "description": "GaN charger compatible with laptops, phones, and tablets", "price": 39.99, "stock": 200, "category": "Electronics", "weight": 0.15},
    {"sku": "ELEC-003", "name": "Mechanical Keyboard RGB", "description": "Cherry MX Blue switches, full RGB, aluminum frame", "price": 129.99, "stock": 45, "category": "Electronics", "weight": 1.1},
    {"sku": "ELEC-004", "name": "4K Webcam Pro", "description": "4K resolution, auto-focus, built-in ring light", "price": 89.99, "stock": 5, "category": "Electronics", "weight": 0.22},
    {"sku": "ELEC-005", "name": "Portable SSD 1TB", "description": "NVMe external SSD, USB 3.2, 1050MB/s read speed", "price": 109.99, "stock": 120, "category": "Electronics", "weight": 0.06},

    {"sku": "CLTH-001", "name": "Classic Fit Oxford Shirt", "description": "100% cotton, button-down collar, available in white and blue", "price": 49.99, "stock": 150, "category": "Clothing", "weight": 0.25},
    {"sku": "CLTH-002", "name": "Slim Fit Chino Pants", "description": "Stretch cotton blend, tapered fit", "price": 59.99, "stock": 8, "category": "Clothing", "weight": 0.45},
    {"sku": "CLTH-003", "name": "Merino Wool Sweater", "description": "Lightweight merino crew neck, machine washable", "price": 79.99, "stock": 60, "category": "Clothing", "weight": 0.35},

    {"sku": "HOME-001", "name": "Smart LED Desk Lamp", "description": "Adjustable color temperature, USB charging port, touch control", "price": 44.99, "stock": 90, "category": "Home & Kitchen", "weight": 1.2},
    {"sku": "HOME-002", "name": "Stainless Steel Water Bottle", "description": "750ml vacuum insulated, keeps drinks cold 24hrs", "price": 24.99, "stock": 300, "category": "Home & Kitchen", "weight": 0.38},
    {"sku": "HOME-003", "name": "Cast Iron Dutch Oven 5.5Qt", "description": "Enameled cast iron, oven-safe to 500°F", "price": 69.99, "stock": 3, "category": "Home & Kitchen", "weight": 5.5},

    {"sku": "BOOK-001", "name": "The Pragmatic Programmer", "description": "20th Anniversary Edition — Andrew Hunt & David Thomas", "price": 42.99, "stock": 75, "category": "Books", "weight": 0.65},
    {"sku": "BOOK-002", "name": "Designing Data-Intensive Applications", "description": "Martin Kleppmann — Big ideas behind reliable, scalable systems", "price": 39.99, "stock": 50, "category": "Books", "weight": 0.75},
    {"sku": "BOOK-003", "name": "Site Reliability Engineering", "description": "How Google Runs Production Systems", "price": 45.99, "stock": 7, "category": "Books", "weight": 0.85},

    {"sku": "SPRT-001", "name": "Yoga Mat Premium 6mm", "description": "Non-slip TPE material, carrying strap included", "price": 34.99, "stock": 110, "category": "Sports & Outdoors", "weight": 1.2},
    {"sku": "SPRT-002", "name": "Adjustable Dumbbell Set 25kg", "description": "Quick-lock mechanism, 2.5kg increments", "price": 199.99, "stock": 25, "category": "Sports & Outdoors", "weight": 25.0},
    {"sku": "SPRT-003", "name": "Running Hydration Belt", "description": "Two 300ml bottles, zippered pouch, reflective strips", "price": 29.99, "stock": 2, "category": "Sports & Outdoors", "weight": 0.35},
]


def seed():
    print("[SEED] Initializing database...")
    initialize_database()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Seed categories
            category_ids = {}
            for cat in CATEGORIES:
                cur.execute(
                    "INSERT INTO categories (name, description) VALUES (%s, %s) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id, name",
                    (cat['name'], cat['description'])
                )
                result = cur.fetchone()
                category_ids[result['name']] = result['id']
                print(f"[SEED] Category: {result['name']} (ID: {result['id']})")

            # Seed products
            for prod in PRODUCTS:
                cat_id = category_ids.get(prod['category'])
                cur.execute(
                    """INSERT INTO products (sku, name, description, price, stock_quantity, category_id, weight_kg)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (sku) DO NOTHING""",
                    (prod['sku'], prod['name'], prod['description'], prod['price'], prod['stock'], cat_id, prod['weight'])
                )
                print(f"[SEED] Product: {prod['sku']} - {prod['name']} (stock: {prod['stock']})")

            conn.commit()

        print(f"\n[SEED] Done! Seeded {len(CATEGORIES)} categories and {len(PRODUCTS)} products.")
        print("[SEED] Some products have low stock (<=10) to trigger alerts during testing.")
    except Exception as e:
        conn.rollback()
        print(f"[SEED] Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    seed()
