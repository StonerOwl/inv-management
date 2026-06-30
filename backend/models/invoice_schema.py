"""
Pydantic schemas for invoice data validation and serialization.
These act as the contract between the LLM extractor and the database.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Sub-models ───────────────────────────────────────────────────────────────

class LineItem(BaseModel):
    name: str
    hsn_code: Optional[str] = None
    unit_price: float = 0.0
    quantity: float = 1.0
    net_amount: float = 0.0
    tax_rate: Optional[float] = None
    tax_type: Optional[str] = None
    tax_amount: Optional[float] = None
    total_amount: float = 0.0

    @field_validator("quantity", "unit_price", "net_amount", "tax_amount", "total_amount", mode="before")
    @classmethod
    def parse_numeric(cls, v: Any) -> float:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        # Strip currency symbols and commas
        cleaned = str(v).replace(",", "").replace("₹", "").replace("Rs.", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0


# TaxBreakdown removed to simplify tax extraction as requested


# ─── Main Invoice Schema ───────────────────────────────────────────────────────

class InvoiceExtracted(BaseModel):
    """
    The structured output the LLM must produce.
    All fields are optional to handle partial extraction gracefully.
    """
    # Identification
    invoice_number: Optional[str] = None
    invoice_details: Optional[str] = None
    invoice_date: Optional[str] = None  # String first, coerced to date later

    # Parties
    pan_no: Optional[str] = None
    gst_registration_no: Optional[str] = None
    cin_no: Optional[str] = None

    # Items
    line_items: list[LineItem] = Field(default_factory=list)

    # Metadata
    confidence_score: float = 0.0  # 0–1, set after validation

    @model_validator(mode="after")
    def validate_and_fix_totals(self) -> InvoiceExtracted:
        """
        Since we removed grand_total based on the user's images, 
        we just validate line items here if needed.
        """
        return self

    def compute_confidence(self) -> float:
        """
        Heuristic confidence score based on how many key fields are populated.
        """
        key_fields = [
            self.invoice_number,
            self.invoice_date,
            self.gst_registration_no,
            self.pan_no,
        ]
        filled = sum(1 for f in key_fields if f is not None)
        base_score = filled / len(key_fields)

        # Bonus for line items
        if self.line_items:
            base_score = min(1.0, base_score + 0.15)
        else:
            # CRITICAL FAIL-SAFE: If no line items are found (usually due to shattered OCR text),
            # heavily penalize the score to force the backend to fall back to the Vision model.
            base_score = base_score * 0.4  # Drop the score by 60%

        # Bonus for CIN
        if self.cin_no:
            base_score = min(1.0, base_score + 0.05)

        return round(base_score, 3)


# ─── API Response Schemas ──────────────────────────────────────────────────────

class InvoiceResponse(BaseModel):
    """Full invoice record returned from DB."""
    id: int
    file_hash: str
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    invoice_details: Optional[str]
    product_description: Optional[str]
    hsn_code: Optional[str]
    quantity: Optional[float]
    gst_registration_no: Optional[str]
    pan_no: Optional[str]
    cin_no: Optional[str]
    total_tax: Optional[float]
    grand_total: Optional[float]
    confidence_score: Optional[float]
    source_type: Optional[str]
    ocr_confidence: Optional[float]
    status: str
    line_items: list[dict] = []
    taxes: list[dict] = []

    class Config:
        from_attributes = True


class JobStatus(BaseModel):
    """Processing job status."""
    job_id: str
    total_files: int
    processed: int
    failed: int
    pending: int
    status: str  # queued | processing | done | partial_failure
    results: list[dict] = []


class StatsResponse(BaseModel):
    total_invoices: int
    total_spend: float
    by_month: list[dict]
    needs_review_count: int
