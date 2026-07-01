"""
Vision-based extractor using Ollama multimodal models natively.
Used as fallback when OCR quality is low, or directly on image invoices.
"""
import base64
import json
import logging
from pathlib import Path
from typing import Optional

from core.extractor import _dict_to_invoice
from models.invoice_schema import InvoiceExtracted
from core.ollama_client import ollama
import config

logger = logging.getLogger(__name__)

VISION_SYSTEM_PROMPT = """You are an expert invoice data extraction assistant.
Look at the invoice image and extract all visible fields.
Respond with ONLY a valid JSON object — no explanations, no markdown.
If a field is not visible, use null.
Include ONLY ACTUAL PHYSICAL PRODUCTS in line items. Do NOT include marketplace fees, shipping, or service charges.
"""

VISION_PROMPT = """Look at this invoice image and extract the following fields as JSON:

{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "pan_no": "string or null",
  "gst_registration_no": "string or null",
  "cin_no": "string or null",
  "line_items": [{"name": "full product description", "quantity": 1, "unit_price": 0.0, "total_price": 0.0, "tax_rate": null, "tax_amount": null}],
  "grand_total": null
}

Rules:
1. Carefully extract the 'Invoice Number' (or Bill No). Do not miss it.
2. Carefully extract 'CIN' (Corporate Identity Number) and 'PAN No' if visible.
3. Line Items: ONLY include physical products. Ignore lines starting with 'Marketplace Fees', 'Shipping', or 'Handling'.
4. Taxes: Strictly extract ONLY numeric rates (e.g. 18) and numeric amounts (e.g. 150.50). Do not include currency symbols.
5. grand_total = Final amount payable. Must be a realistic number.

Return ONLY the JSON:"""


async def extract_from_image(
    image_path: Path,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Send image directly to vision LLM natively and extract invoice fields.
    Used when OCR confidence is low or as an additional validation pass.
    """
    model = model or config.OLLAMA_VISION_MODEL
    logger.info(f"Vision extraction natively: {image_path.name} → model={model}")

    try:
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        response = await ollama.generate(
            model=model,
            prompt=VISION_PROMPT,
            system=VISION_SYSTEM_PROMPT,
            images=[img_b64],
            format="json",
            options={
                "temperature": 0.0,
                "num_ctx": 4096
            }
        )

        response_text = response.get("response", "").strip()
        
        if not response_text:
            logger.error("Empty response from Ollama vision")
            return InvoiceExtracted(confidence_score=0.0)

        try:
            # Strip markdown fences if present
            import re
            cleaned_text = response_text
            if "```" in cleaned_text:
                match = re.search(r'```(?:json)?(.*?)```', cleaned_text, re.DOTALL)
                if match:
                    cleaned_text = match.group(1).strip()
            extracted_dict = json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error from Ollama vision response: {e}\\nRaw response: {response_text}")
            return InvoiceExtracted(confidence_score=0.0)

        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()
        return invoice

    except Exception as e:
        logger.error(f"Vision extraction failed: {e}")
        return InvoiceExtracted(confidence_score=0.0)


async def is_vision_model_available() -> bool:
    """Check if a vision model is pulled and ready."""
    return await ollama.is_model_available(config.OLLAMA_VISION_MODEL)
