import asyncio
import os
import io
from pathlib import Path
import fitz
from PIL import Image

# Import the OCR engine
from core.ocr_engine import run_ocr
from core.preprocessor import light_preprocess_image

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
        
    print(f"Testing Tesseract OCR on {pdf_path}")
    doc = fitz.open(str(pdf_path))
    pages_text = []
    
    for page in doc:
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))
        
        processed = light_preprocess_image(img)
        result = run_ocr(processed)
        pages_text.append(result.text)
        
    doc.close()
    
    full_text = "\n\n".join(pages_text)
    print("--- OCR TEXT START ---")
    print(full_text[:1500])
    print("--- OCR TEXT END ---")

if __name__ == "__main__":
    asyncio.run(main())
