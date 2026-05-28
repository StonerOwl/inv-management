"""
Core LLM-based invoice field extractor.
Sends OCR text to Ollama and parses the structured JSON response.
"""
import json
import logging
from typing import Optional

from core.ollama_client import ollama, extract_json_from_response
from models.invoice_schema import InvoiceExtracted, LineItem, TaxBreakdown, Address
import config

logger = logging.getLogger(__name__)

# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert invoice data extraction assistant specializing in Indian e-commerce invoices (Amazon India, Flipkart, Meesho, Myntra, Snapdeal, etc.).

Your task: extract all structured fields from the raw invoice text provided.

RULES:
- Respond with ONLY a valid JSON object. No markdown, no explanations.
- If a field is not found, use null.
- For amounts, use numbers only (no currency symbols or commas).
- For dates, use YYYY-MM-DD format if possible, otherwise the original text.
- GSTIN format is 15 characters: e.g. 29AABCT1332L1ZD
- Detect the platform from seller name or document headers (Amazon, Flipkart, Meesho, etc.)
- Include ALL line items found in the invoice.
"""

# ─── Extraction prompt template ────────────────────────────────────────────────
EXTRACTION_PROMPT = """Extract all fields from the following invoice text and return a JSON object with this exact schema:

{{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or original date string or null",
  "order_id": "string or null",
  "platform": "Amazon|Flipkart|Meesho|Other or null",
  "seller_name": "string or null",
  "seller_gstin": "15-char GSTIN or null",
  "seller_address": {{
    "line1": "string or null",
    "line2": "string or null",
    "city": "string or null",
    "state": "string or null",
    "pincode": "string or null"
  }},
  "buyer_name": "string or null",
  "billing_address": {{
    "line1": "string or null",
    "city": "string or null",
    "state": "string or null",
    "pincode": "string or null"
  }},
  "shipping_address": {{
    "line1": "string or null",
    "city": "string or null",
    "state": "string or null",
    "pincode": "string or null"
  }},
  "line_items": [
    {{
      "name": "product name",
      "sku": "string or null",
      "hsn_code": "string or null",
      "quantity": 1,
      "unit_price": 0.0,
      "total_price": 0.0,
      "tax_rate": null,
      "tax_amount": null
    }}
  ],
  "subtotal": 0.0,
  "tax_breakdown": {{
    "cgst_rate": null,
    "cgst_amount": null,
    "sgst_rate": null,
    "sgst_amount": null,
    "igst_rate": null,
    "igst_amount": null,
    "cess_amount": null,
    "total_tax": null
  }},
  "grand_total": 0.0,
  "currency": "INR",
  "payment_method": "string or null"
}}

INVOICE TEXT:
---
{raw_text}
---

Return ONLY the JSON object:"""


async def extract_invoice_fields(
    raw_text: str,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Main extraction function.
    Sends raw text to Ollama and returns a validated InvoiceExtracted object.
    """
    model = model or config.OLLAMA_TEXT_MODEL

    # Truncate very long text to avoid context window overflow
    max_chars = 8000
    text_for_llm = raw_text[:max_chars]
    if len(raw_text) > max_chars:
        logger.warning(f"Text truncated from {len(raw_text)} to {max_chars} chars for LLM")

    prompt = EXTRACTION_PROMPT.format(raw_text=text_for_llm)

    logger.info(f"Sending to Ollama model={model} ({len(text_for_llm)} chars)")

    try:
        response = await ollama.generate(
            prompt=prompt,
            model=model,
            system=SYSTEM_PROMPT,
            temperature=0.05,
        )
        logger.debug(f"Raw Ollama response (first 500 chars): {response[:500]}")

        extracted_dict = extract_json_from_response(response)
        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()

        logger.info(
            f"Extraction complete: invoice_number={invoice.invoice_number}, "
            f"total={invoice.grand_total}, confidence={invoice.confidence_score}"
        )
        return invoice

    except ValueError as e:
        logger.error(f"JSON parse error from Ollama: {e}")
        # Return empty invoice with zero confidence
        return InvoiceExtracted(confidence_score=0.0)
    except RuntimeError as e:
        logger.error(f"Ollama runtime error: {e}")
        raise


def _dict_to_invoice(data: dict) -> InvoiceExtracted:
    """Convert raw dict from LLM to validated InvoiceExtracted."""
    # Nested address parsing
    for addr_field in ["seller_address", "billing_address", "shipping_address"]:
        if isinstance(data.get(addr_field), dict):
            data[addr_field] = Address(**{
                k: v for k, v in data[addr_field].items() if v
            })
        elif data.get(addr_field) is None:
            data[addr_field] = None

    # Line items
    raw_items = data.pop("line_items", []) or []
    line_items = []
    for item in raw_items:
        if isinstance(item, dict) and item.get("name"):
            try:
                line_items.append(LineItem(**item))
            except Exception as e:
                logger.debug(f"Skipped malformed line item: {e}")
    data["line_items"] = line_items

    # Tax breakdown
    if isinstance(data.get("tax_breakdown"), dict):
        try:
            data["tax_breakdown"] = TaxBreakdown(**data["tax_breakdown"])
        except Exception:
            data["tax_breakdown"] = None

    return InvoiceExtracted(**{k: v for k, v in data.items() if v is not None or k in ("confidence_score",)})
