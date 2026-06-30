import sqlite3
import os

db_path = os.path.join("data", "invoices.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, invoice_number, confidence_score, source_type, ocr_confidence FROM invoices WHERE invoice_number LIKE '%SMAH-31122%';")
rows = cur.fetchall()

print("Invoices matching SMAH-31122:")
for r in rows:
    print(r)

cur.execute("SELECT count(*) FROM line_items WHERE invoice_id = ?", (rows[-1][0] if rows else 0,))
print(f"Line items for last matching invoice: {cur.fetchone()[0]}")

conn.close()
