"""
Vision-based extractor using Ollama multimodal models (llava, moondream).
Used as fallback when OCR quality is low, or directly on image invoices.
"""
import logging
from pathlib import Path
from typing import Optional

from core.ollama_client import ollama, extract_json_from_response
from core.extractor import _dict_to_invoice
from models.invoice_schema import InvoiceExtracted
import config

logger = logging.getLogger(__name__)

VISION_SYSTEM_PROMPT = """You are an expert invoice data extraction assistant.
Look at the invoice image and extract all visible fields.
Respond with ONLY a valid JSON object — no explanations, no markdown.
If a field is not visible, use null."""

VISION_PROMPT = """Look at this invoice image and extract the following fields as JSON:

{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "order_id": "string or null",
  "platform": "Amazon|Flipkart|Meesho|Other or null",
  "seller_name": "string or null",
  "seller_gstin": "string or null",
  "buyer_name": "string or null",
  "billing_address": {"line1": null, "city": null, "state": null, "pincode": null},
  "shipping_address": {"line1": null, "city": null, "state": null, "pincode": null},
  "line_items": [{"name": "product", "quantity": 1, "unit_price": 0.0, "total_price": 0.0}],
  "subtotal": null,
  "grand_total": null,
  "currency": "INR",
  "payment_method": null
}

Return ONLY the JSON:"""


async def extract_from_image(
    image_path: Path,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Send image directly to vision LLM and extract invoice fields.
    Used when OCR confidence is low or as an additional validation pass.
    """
    model = model or config.OLLAMA_VISION_MODEL
    logger.info(f"Vision extraction: {image_path.name} → model={model}")

    try:
        response = await ollama.generate_with_image(
            prompt=VISION_PROMPT,
            image_path=image_path,
            model=model,
            system=VISION_SYSTEM_PROMPT,
        )
        logger.debug(f"Vision response (first 500): {response[:500]}")

        extracted_dict = extract_json_from_response(response)
        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()
        return invoice

    except Exception as e:
        logger.error(f"Vision extraction failed: {e}")
        return InvoiceExtracted(confidence_score=0.0)


async def is_vision_model_available() -> bool:
    """Check if a vision model is pulled and ready."""
    return await ollama.is_model_available(config.OLLAMA_VISION_MODEL)
