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

class Address(BaseModel):
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = "India"

    def as_string(self) -> str:
        parts = [p for p in [self.line1, self.line2, self.city, self.state, self.pincode] if p]
        return ", ".join(parts)


class LineItem(BaseModel):
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity: float = 1.0
    unit_price: float = 0.0
    total_price: float = 0.0
    tax_rate: Optional[float] = None  # Percentage, e.g. 18.0 for 18% GST
    tax_amount: Optional[float] = None

    @field_validator("quantity", "unit_price", "total_price", mode="before")
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


class TaxBreakdown(BaseModel):
    cgst_rate: Optional[float] = None
    cgst_amount: Optional[float] = None
    sgst_rate: Optional[float] = None
    sgst_amount: Optional[float] = None
    igst_rate: Optional[float] = None
    igst_amount: Optional[float] = None
    cess_amount: Optional[float] = None
    total_tax: Optional[float] = None


# ─── Main Invoice Schema ───────────────────────────────────────────────────────

class InvoiceExtracted(BaseModel):
    """
    The structured output the LLM must produce.
    All fields are optional to handle partial extraction gracefully.
    """
    # Identification
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None  # String first, coerced to date later
    order_id: Optional[str] = None
    platform: Optional[str] = None  # Amazon, Flipkart, Meesho, etc.

    # Parties
    seller_name: Optional[str] = None
    seller_gstin: Optional[str] = None
    seller_address: Optional[Address] = None

    buyer_name: Optional[str] = None
    billing_address: Optional[Address] = None
    shipping_address: Optional[Address] = None

    # Items
    line_items: list[LineItem] = Field(default_factory=list)

    # Financials
    subtotal: Optional[float] = None
    tax_breakdown: Optional[TaxBreakdown] = None
    grand_total: Optional[float] = None
    currency: str = "INR"

    # Payment
    payment_method: Optional[str] = None

    # Metadata
    confidence_score: float = 0.0  # 0–1, set after validation

    @field_validator("subtotal", "grand_total", mode="before")
    @classmethod
    def parse_amount(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        cleaned = str(v).replace(",", "").replace("₹", "").replace("Rs.", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

    def compute_confidence(self) -> float:
        """
        Heuristic confidence score based on how many key fields are populated.
        """
        key_fields = [
            self.invoice_number,
            self.invoice_date,
            self.seller_name,
            self.grand_total,
            self.buyer_name,
            self.order_id,
        ]
        filled = sum(1 for f in key_fields if f is not None)
        base_score = filled / len(key_fields)

        # Bonus for line items
        if self.line_items:
            base_score = min(1.0, base_score + 0.1)

        # Bonus for GSTIN
        if self.seller_gstin:
            base_score = min(1.0, base_score + 0.05)

        return round(base_score, 3)


# ─── API Response Schemas ──────────────────────────────────────────────────────

class InvoiceResponse(BaseModel):
    """Full invoice record returned from DB."""
    id: int
    file_name: str
    file_hash: str
    platform: Optional[str]
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    order_id: Optional[str]
    seller_name: Optional[str]
    seller_gstin: Optional[str]
    buyer_name: Optional[str]
    billing_address: Optional[str]
    shipping_address: Optional[str]
    subtotal: Optional[float]
    grand_total: Optional[float]
    currency: str
    payment_method: Optional[str]
    confidence_score: Optional[float]
    source_type: Optional[str]
    ocr_confidence: Optional[float]
    status: str
    created_at: datetime
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
    by_platform: dict[str, float]
    by_month: list[dict]
    top_sellers: list[dict]
    needs_review_count: int
