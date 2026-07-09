import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/invoiceai")

url = DATABASE_URL.replace("postgresql://", "").replace("postgres://", "")
user_pass, rest = url.split("@")
host_port, dbname = rest.split("/")
user, password = user_pass.split(":")
host, port = host_port.split(":") if ":" in host_port else (host_port, "5432")

conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(1000) NOT NULL,
        quantity FLOAT DEFAULT 1.0,
        unit_price FLOAT DEFAULT 0.0,
        total_amount FLOAT DEFAULT 0.0,
        hsn_code VARCHAR(255),
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        invoice_number VARCHAR(200),
        source_file_name VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
""")
print("inventory_items table created (or already existed).")

cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_inventory_items_id ON inventory_items(id);
    CREATE INDEX IF NOT EXISTS ix_inventory_items_invoice_id ON inventory_items(invoice_id);
""")
print("Indexes created.")

cur.close()
conn.close()
print("Done.")