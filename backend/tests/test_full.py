import asyncio
from pathlib import Path
from core.document_loader import load_document
from core.extractor import extract_invoice_fields
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def main():
    uploads_dir = Path("uploads")
    pdf_path = None
    for p in uploads_dir.rglob("*.pdf"):
        if "brother" in p.name.lower():
            pdf_path = p
            break
            
    if not pdf_path:
        print("PDF not found")
        return
        
    print(f"Loading {pdf_path}")
    doc_result = load_document(pdf_path)
    print("Extracted Text Length:", len(doc_result.raw_text))
    
    print("Running 3B Extractor...")
    extracted = await extract_invoice_fields(doc_result.raw_text)
    print(extracted.model_dump_json(indent=2))

if __name__ == "__main__":
    asyncio.run(main())
