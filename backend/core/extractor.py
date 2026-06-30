"""
Core LLM-based invoice field extractor.
Sends OCR text to Ollama and parses the structured JSON response using LangChain.
"""
import logging
from typing import Optional

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException

from models.invoice_schema import InvoiceExtracted, LineItem
import config

logger = logging.getLogger(__name__)

# ─── Reusable LLM instance (singleton) ───────────────────────────────────────
# Avoids creating a new HTTP connection on every extraction call.
# LangChain's ChatOllama maintains an internal httpx client that benefits
# from TCP connection reuse (keep-alive) across requests.
_text_llm: Optional[ChatOllama] = None


def _get_text_llm(model: Optional[str] = None) -> ChatOllama:
    """Return a reusable ChatOllama instance, creating it on first call."""
    global _text_llm
    resolved_model = model or config.OLLAMA_TEXT_MODEL
    # Recreate if model changed or first call
    if _text_llm is None or _text_llm.model != resolved_model:
        _text_llm = ChatOllama(
            model=resolved_model,
            base_url=config.OLLAMA_HOST,
            temperature=0.05,
            format="json",
            keep_alive="10m",    # Keep model loaded in RAM between requests
        )
    return _text_llm


# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert invoice data extraction assistant specializing in Indian invoices (B2B tax invoices, e-commerce invoices from Amazon, Flipkart, Meesho, Myntra, etc.).

CRITICAL RULES:
1. Respond with ONLY a valid JSON object. No markdown fences, no explanations, no extra text.
2. If a field is not found in the text, use null — NEVER guess or hallucinate values.
3. For all amounts: use numbers only (no ₹, Rs., commas). Example: 1234.56
4. Dates: use YYYY-MM-DD format. If only partial date is visible, return what you can.
5. GSTIN is exactly 15 alphanumeric characters (e.g., 29AABCT1332L1ZD).
6. PAN is exactly 10 alphanumeric characters (e.g., AABCT1332L).
7. CIN starts with U or L and is 21 characters.
8. Line items: Include ONLY physical products/goods. EXCLUDE shipping charges, marketplace fees, handling fees, service charges, platform fees.
9. For each line item, carefully read the table columns. Map Description→name, HSN/SAC→hsn_code, Unit Price→unit_price, Qty→quantity, Net Amount→net_amount, Tax Rate→tax_rate (number only, e.g. 18 not 18%), Tax Type→tax_type (IGST/CGST/SGST), Tax Amount→tax_amount, Total Amount→total_amount.
"""

# ─── Extraction prompt template ──────────────────────────────────────────────
# Note: Double curly braces {{ }} are literal braces in LangChain templates.
# Only {raw_text} is a real placeholder.
EXTRACTION_TEMPLATE = """Extract structured data from this invoice. Return ONLY this JSON schema:

{{
  "invoice_number": "string|null",
  "invoice_details": "string|null",
  "invoice_date": "YYYY-MM-DD|null",
  "pan_no": "10-char PAN|null",
  "gst_registration_no": "15-char GSTIN|null",
  "cin_no": "21-char CIN|null",
  "line_items": [
    {{
      "name": "product description",
      "hsn_code": "string|null",
      "unit_price": 0.0,
      "quantity": 1,
      "net_amount": 0.0,
      "tax_rate": null,
      "tax_type": "IGST|CGST|SGST|null",
      "tax_amount": null,
      "total_amount": 0.0
    }}
  ]
}}

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

JSON:"""


# ─── Build the chain once at module level ────────────────────────────────────
# ChatPromptTemplate properly separates system and human messages,
# so Ollama can distinguish instructions from data.
_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", EXTRACTION_TEMPLATE),
])
_json_parser = JsonOutputParser()


async def extract_invoice_fields(
    raw_text: str,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Main extraction function.
    Sends raw text to Ollama via LangChain and returns a validated InvoiceExtracted object.
    """
    # Truncate only extremely long documents — keep enough for all line items
    max_chars = 12000
    text_for_llm = raw_text[:max_chars]
    if len(raw_text) > max_chars:
        logger.warning(f"Text truncated from {len(raw_text)} to {max_chars} chars for LLM")

    llm = _get_text_llm(model)
    chain = _extraction_prompt | llm | _json_parser

    logger.info(f"Sending to Ollama model={llm.model} via LangChain ({len(text_for_llm)} chars)")

    try:
        extracted_dict = await chain.ainvoke({"raw_text": text_for_llm})

        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()

        logger.info(
            f"Extraction complete: invoice_number={invoice.invoice_number}, "
            f"confidence={invoice.confidence_score}"
        )
        return invoice

    except OutputParserException as e:
        logger.error(f"JSON parse error from LangChain: {e}")
        # Return empty invoice with zero confidence
        return InvoiceExtracted(confidence_score=0.0)
    except Exception as e:
        logger.error(f"LangChain/Ollama runtime error: {e}")
        raise RuntimeError(f"Ollama error: {e}")


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

    # Tax breakdown has been removed from schema, ensuring any stray LLM data doesn't crash
    if "tax_breakdown" in data:
        data.pop("tax_breakdown", None)

    return InvoiceExtracted(**{k: v for k, v in data.items() if v is not None or k in ("confidence_score",)})
