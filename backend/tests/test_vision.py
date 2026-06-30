import asyncio
from core.vision_extractor import extract_from_image
from pathlib import Path
import json

async def main():
    # Find the pdf path in uploads
    uploads_dir = Path("uploads")
    pdf_path = None
    for p in uploads_dir.rglob("*.pdf"):
        if "brother" in p.name.lower():
            pdf_path = p
            break
            
    if not pdf_path:
        print("PDF not found")
        return
        
    print(f"Testing vision on {pdf_path}")
    
    # We have to convert it to PNG first just like background_tasks does
    import fitz
    doc = fitz.open(str(pdf_path))
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    temp_png = pdf_path.with_suffix(".temp.png")
    pix.save(str(temp_png))
    doc.close()
    
    try:
        vision_result = await extract_from_image(temp_png)
        print("Vision Result:")
        print(vision_result.model_dump_json(indent=2))
    except Exception as e:
        print(f"Vision failed: {e}")
        
    if temp_png.exists():
        temp_png.unlink()

if __name__ == "__main__":
    asyncio.run(main())
