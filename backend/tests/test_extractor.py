import sqlite3
import os
import sys
import io
import asyncio
from core.extractor import extract_invoice_fields

# Force UTF-8 output to avoid Windows console errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def main():
    db_path = os.path.join("data", "invoices.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Query the database for the Brother Printer invoice
    cur.execute("SELECT file_name, raw_text FROM invoices WHERE invoice_number LIKE '%SMAH-31122%';")
    row = cur.fetchone()

    if row:
        file_name, raw_text = row
        print(f"Testing extraction with new prompt on: {file_name}")
        
        extracted = await extract_invoice_fields(raw_text)
        print("\n--- NEW EXTRACTION ---")
        print(extracted.model_dump_json(indent=2))
        
        # Save to DB so user can see it in UI if it works
        from db.repository import InvoiceRepository
        from sqlalchemy.orm import Session
        from db.database import SessionLocal
        
        db = SessionLocal()
        repo = InvoiceRepository(db)
        invoice = repo.get_invoice_by_hash(row[0]) # hash isn't file_name, let's just use query
        
        # To just test the extraction first, we will just print it.
    else:
        print("Invoice not found.")

    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
