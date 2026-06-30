import asyncio
from core.extractor import extract_invoice_fields
from core.ollama_client import ollama
import sqlite3
import os

async def main():
    # Force 7b for this test
    os.environ["OLLAMA_TEXT_MODEL"] = "qwen2.5:7b"
    
    db_path = os.path.join("data", "invoices.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    # Using the same row we extracted earlier for brother printer
    cur.execute("SELECT raw_text FROM invoices WHERE invoice_number LIKE '%SMAH-31122%';")
    row = cur.fetchone()
    if row:
        print("Testing 7B model on broken OCR text...")
        extracted = await extract_invoice_fields(row[0])
        print(extracted.model_dump_json(indent=2))
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
