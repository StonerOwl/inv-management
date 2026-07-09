"""
Core LLM-based invoice field extractor.
Sends OCR text to Ollama and parses the structured JSON response natively.
"""
import json
import logging
from typing import Optional

from models.invoice_schema import InvoiceExtracted, LineItem
from core.ollama_client import ollama
import config

logger = logging.getLogger(__name__)

# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert invoice data extraction assistant specializing in Indian invoices (B2B tax invoices, e-commerce invoices).

CRITICAL RULES:
1. Respond with ONLY a valid JSON object. No markdown fences, no explanations, no extra text.
2. If a field is not found in the text, use null — NEVER guess or hallucinate values.
3. For all amounts: use numbers only (no ₹, Rs., commas). Example: 1234.56
4. Dates: use YYYY-MM-DD format. If only partial date is visible, return what you can.
5. GSTIN is exactly 15 alphanumeric characters (e.g., 29AABCT1332L1ZD).
6. PAN is exactly 10 alphanumeric characters (e.g., AABCT1332L).
7. CIN starts with U or L and is 21 characters.
8. Line items: Include all rows from the table. Do not filter.
9. For each line item, carefully read the table columns. Map Description→name, HSN/SAC→hsn_code, Unit Price→unit_price, Qty→quantity, Net Amount→net_amount, Tax Rate→tax_rate (number only, e.g. 18 not 18%), Tax Type→tax_type (IGST/CGST/SGST), Tax Amount→tax_amount, Total Amount→total_amount.
"""

EXTRACTION_TEMPLATE = """Extract structured data from this invoice. Return ONLY this JSON schema:

{
  "invoice_number": "string or null",
  "invoice_details": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "pan_no": "string or null",
  "gst_registration_no": "string or null",
  "cin_no": "string or null",
  "line_items": [
    {
      "name": "product description",
      "hsn_code": "string or null",
      "unit_price": 0.0,
      "quantity": 1,
      "net_amount": 0.0,
      "tax_rate": null,
      "tax_type": "IGST, CGST, SGST, or null",
      "tax_amount": null,
      "total_amount": 0.0
    }
  ]
}

EXTRACTION HINTS:
- invoice_number: Look for "Invoice Number", "Invoice No", "Bill No", "Tax Invoice No" near the top.
- invoice_details: Any secondary reference like "Invoice Details" or sub-invoice number.
- pan_no: Look for "PAN No", "PAN:", usually 10 characters like AABCT1332L.
- gst_registration_no: Look for "GSTIN", "GST Registration No", "GST No".
- cin_no: Look for "CIN", "Corporate Identity Number", starts with U or L.
- Line items are usually in a table. Read each row carefully.

INVOICE TEXT:
---
{raw_text}
---

Return ONLY JSON:"""

async def extract_invoice_fields(
    raw_text: str,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Main extraction function.
    Sends raw text to Ollama and returns a validated InvoiceExtracted object.
    """
    # Truncate raw text to a reasonable limit for small local models to avoid massive slowdowns
    max_chars = 6000
    text_for_llm = raw_text[:max_chars]
    if len(raw_text) > max_chars:
        logger.warning(f"Text truncated from {len(raw_text)} to {max_chars} chars for LLM")

    resolved_model = model or config.OLLAMA_TEXT_MODEL
    prompt = EXTRACTION_TEMPLATE.replace("{raw_text}", text_for_llm)

    logger.info(f"Sending to Ollama model={resolved_model} natively ({len(text_for_llm)} chars)")

    try:
        response = await ollama.generate(
            model=resolved_model,
            prompt=prompt,
            system=SYSTEM_PROMPT,
            format="json",
            options={
                "temperature": 0.0,
                "num_ctx": 4096
            }
        )
        
        response_text = response.get("response", "").strip()
        
        if not response_text:
            logger.error("Empty response from Ollama")
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
            logger.error(f"JSON parse error from Ollama response: {e}\\nRaw response: {response_text}")
            return InvoiceExtracted(confidence_score=0.0)

        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()

        logger.info(
            f"Extraction complete: invoice_number={invoice.invoice_number}, "
            f"confidence={invoice.confidence_score}"
        )
        return invoice

    except Exception as e:
        logger.error(f"Ollama runtime error: {e}")
        return InvoiceExtracted(confidence_score=0.0)

def _dict_to_invoice(data: dict) -> InvoiceExtracted:
    """Convert raw dict from LLM to validated InvoiceExtracted."""
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

    if "tax_breakdown" in data:
        data.pop("tax_breakdown", None)

    return InvoiceExtracted(**{k: v for k, v in data.items() if v is not None or k in ("confidence_score",)})
