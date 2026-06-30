import asyncio
from pathlib import Path
from core.document_loader import load_document

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
        
    doc_result = load_document(pdf_path)
    print("--- EXTRACTED TEXT ---")
    print(doc_result.raw_text)

if __name__ == "__main__":
    asyncio.run(main())
