"""
Vision-based extractor using Ollama multimodal models via LangChain.
Used as fallback when OCR quality is low, or directly on image invoices.
"""
import base64
import logging
from pathlib import Path
from typing import Optional

from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException

from core.extractor import _dict_to_invoice
from models.invoice_schema import InvoiceExtracted
import config

logger = logging.getLogger(__name__)

# ─── Reusable vision LLM instance (singleton) ────────────────────────────────
_vision_llm: Optional[ChatOllama] = None


def _get_vision_llm(model: Optional[str] = None) -> ChatOllama:
    """Return a reusable ChatOllama vision instance, creating it on first call."""
    global _vision_llm
    resolved_model = model or config.OLLAMA_VISION_MODEL
    if _vision_llm is None or _vision_llm.model != resolved_model:
        _vision_llm = ChatOllama(
            model=resolved_model,
            base_url=config.OLLAMA_HOST,
            temperature=0.1,
            format="json",
            keep_alive="10m",
        )
    return _vision_llm


# ─── Module-level parser (reusable) ──────────────────────────────────────────
_json_parser = JsonOutputParser()

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
  "order_id": "string or null",
  "seller_gstin": "string or null",
  "line_items": [{"name": "full product description", "quantity": 1, "unit_price": 0.0, "total_price": 0.0, "tax_rate": null, "tax_amount": null}],
  "tax_breakdown": {"cgst_rate":null,"cgst_amount":null,"sgst_rate":null,"sgst_amount":null,"igst_rate":null,"igst_amount":null,"total_tax":null},
  "grand_total": null
}

Rules:
1. Carefully extract the 'Invoice Number' (or Bill No). Do not miss it.
2. Line Items: ONLY include physical products. Ignore lines starting with 'Marketplace Fees', 'Shipping', or 'Handling'.
3. Taxes: Strictly extract ONLY numeric rates (e.g. 18) and numeric amounts (e.g. 150.50). Do not include currency symbols.
4. grand_total = Final amount payable. Must be a realistic number.

Return ONLY the JSON:"""


async def extract_from_image(
    image_path: Path,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Send image directly to vision LLM via LangChain and extract invoice fields.
    Used when OCR confidence is low or as an additional validation pass.
    """
    model = model or config.OLLAMA_VISION_MODEL
    logger.info(f"Vision extraction via LangChain: {image_path.name} → model={model}")

    try:
        # Detect MIME type from extension for correct base64 encoding
        suffix = image_path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".webp": "image/webp",
            ".tiff": "image/tiff", ".tif": "image/tiff",
            ".bmp": "image/bmp",
        }
        mime_type = mime_map.get(suffix, "image/jpeg")

        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        llm = _get_vision_llm(model)

        messages = [
            SystemMessage(content=VISION_SYSTEM_PROMPT),
            HumanMessage(content=[
                {"type": "text", "text": VISION_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{img_b64}"}}
            ])
        ]

        chain = llm | _json_parser
        extracted_dict = await chain.ainvoke(messages)

        if not isinstance(extracted_dict, dict):
            logger.warning("Vision model returned a non-dict JSON object.")
            return InvoiceExtracted(confidence_score=0.0)

        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()
        return invoice

    except OutputParserException as e:
        logger.error(f"Vision JSON parse error from LangChain: {e}")
        return InvoiceExtracted(confidence_score=0.0)
    except Exception as e:
        logger.error(f"Vision extraction failed: {e}")
        return InvoiceExtracted(confidence_score=0.0)


async def is_vision_model_available() -> bool:
    """Check if a vision model is pulled and ready."""
    from core.ollama_client import ollama
    return await ollama.is_model_available(config.OLLAMA_VISION_MODEL)
