import sqlite3
import os

db_path = os.path.join("data", "invoices.db")
print(f"Connecting to {db_path}...")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# ALTER TABLE invoices
try:
    cur.execute("ALTER TABLE invoices ADD COLUMN invoice_details VARCHAR(200);")
    print("Added invoice_details")
except sqlite3.OperationalError as e:
    print(f"invoice_details error: {e}")

try:
    cur.execute("ALTER TABLE invoices ADD COLUMN gst_registration_no VARCHAR(50);")
    print("Added gst_registration_no")
except sqlite3.OperationalError as e:
    print(f"gst_registration_no error: {e}")

try:
    cur.execute("ALTER TABLE invoices ADD COLUMN pan_no VARCHAR(50);")
    print("Added pan_no")
except sqlite3.OperationalError as e:
    print(f"pan_no error: {e}")

try:
    cur.execute("ALTER TABLE invoices ADD COLUMN cin_no VARCHAR(50);")
    print("Added cin_no")
except sqlite3.OperationalError as e:
    print(f"cin_no error: {e}")

# ALTER TABLE line_items
try:
    cur.execute("ALTER TABLE line_items ADD COLUMN net_amount FLOAT DEFAULT 0.0;")
    print("Added net_amount")
except sqlite3.OperationalError as e:
    print(f"net_amount error: {e}")

try:
    cur.execute("ALTER TABLE line_items ADD COLUMN tax_type VARCHAR(50);")
    print("Added tax_type")
except sqlite3.OperationalError as e:
    print(f"tax_type error: {e}")

try:
    cur.execute("ALTER TABLE line_items ADD COLUMN total_amount FLOAT DEFAULT 0.0;")
    print("Added total_amount")
except sqlite3.OperationalError as e:
    print(f"total_amount error: {e}")

conn.commit()
conn.close()
print("Done.")
