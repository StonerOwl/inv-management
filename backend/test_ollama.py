import asyncio
import time
import httpx
import json
from models.invoice_schema import InvoiceExtracted

async def main():
    text = "Invoice Number: INV-1234\nCIN: L12345MH2020PLC123456\nGrand Total: 150.00\nLine Items:\n1. Widget 10.00"
    schema = InvoiceExtracted.model_json_schema()
    
    prompt = f"Extract data into JSON matching the schema.\nText: {text}"

    start = time.time()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:3b",
                "prompt": prompt,
                "format": schema,
                "stream": False,
                "options": {"temperature": 0.0, "num_ctx": 4096}
            },
            timeout=180
        )
    data = resp.json()
    print(f"Time: {time.time() - start:.2f}s")
    print(data["response"])

asyncio.run(main())
