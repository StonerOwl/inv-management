import sqlite3
import os

db_path = os.path.join("data", "invoices.db")
print(f"Connecting to {db_path}...")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

columns = [
    ("batch_id", "VARCHAR(50)"),
    ("product", "VARCHAR(200)"),
    ("work_order", "VARCHAR(100)"),
    ("category", "VARCHAR(100)"),
    ("start_date", "VARCHAR(50)"),
    ("target_date", "VARCHAR(50)"),
    ("location", "VARCHAR(200)")
]

for col_name, col_type in columns:
    try:
        cur.execute(f"ALTER TABLE pws_items ADD COLUMN {col_name} {col_type};")
        print(f"Added {col_name}")
    except sqlite3.OperationalError as e:
        print(f"{col_name} error: {e}")

conn.commit()
conn.close()
print("Migration done.")
