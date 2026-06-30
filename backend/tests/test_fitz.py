import asyncio
from pathlib import Path
import fitz
import pdfplumber

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
        
    print(f"Testing fitz layout extraction on {pdf_path}")
    doc = fitz.open(str(pdf_path))
    text = ""
    for page in doc:
        text += page.get_text("layout") + "\n\n"
    doc.close()
    
    print(text[:1000])

if __name__ == "__main__":
    asyncio.run(main())
