import asyncio
from pathlib import Path
import pdfplumber
import json

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
        
    print(f"Testing pdfplumber extract_tables on {pdf_path}")
    
    with pdfplumber.open(str(pdf_path)) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            print(f"--- Page {i+1} Tables ---")
            for j, table in enumerate(tables):
                print(f"Table {j+1}:")
                for row in table:
                    # Clean up newlines in cells
                    cleaned_row = [cell.replace('\n', ' ') if cell else '' for cell in row]
                    print(" | ".join(cleaned_row))
            
            # Also try the advanced extract_words to see if we can build a better text representation
            print(f"--- Page {i+1} Text with Layout ---")
            text = page.extract_text(layout=True)
            print(text[:1000] if text else "None")

if __name__ == "__main__":
    asyncio.run(main())
