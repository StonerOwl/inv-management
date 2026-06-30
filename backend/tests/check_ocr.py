import sqlite3
import os
import sys
import io

# Force UTF-8 output to avoid Windows console errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = os.path.join("data", "invoices.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Query the database for the Brother Printer invoice
cur.execute("SELECT file_name, raw_text, raw_json FROM invoices WHERE invoice_number LIKE '%SMAH-31122%';")
row = cur.fetchone()

if row:
    file_name, raw_text, raw_json = row
    print(f"File Name: {file_name}")
    print("\n--- RAW TEXT ---\n")
    print(raw_text[:2000])  # Print first 2000 chars of raw text
    print("\n--- RAW JSON ---\n")
    print(raw_json)
else:
    print("Invoice SMAH-31122 not found.")

conn.close()
