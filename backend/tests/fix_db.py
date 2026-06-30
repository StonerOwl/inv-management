import os
import sqlite3
import asyncio
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.repository import InvoiceRepository
from core.extractor import extract_invoice_fields
import logging

logging.basicConfig(level=logging.INFO)

async def main():
    print("Deleting old invoice from DB...")
    db = SessionLocal()
    repo = InvoiceRepository(db)
    
    # Delete invoice ID 1 manually to bypass UI
    try:
        repo.delete_invoice(1)
        db.commit()
        print("Deleted invoice 1.")
    except Exception as e:
        print(f"Delete failed: {e}")
        db.rollback()
        
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
