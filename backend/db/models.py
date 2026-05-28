"""
SQLAlchemy ORM models for the invoice database.
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, func
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # File metadata
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    file_size_bytes = Column(Integer)
    page_count = Column(Integer)
    source_type = Column(String(50))      # pdf_native | pdf_ocr | image_ocr | image_vision
    ocr_confidence = Column(Float)

    # Platform & identification
    platform = Column(String(100), index=True)
    invoice_number = Column(String(200), index=True)
    invoice_date = Column(String(50))
    order_id = Column(String(200), index=True)

    # Seller
    seller_name = Column(String(500))
    seller_gstin = Column(String(20))
    seller_address = Column(Text)         # JSON string

    # Buyer
    buyer_name = Column(String(500))
    billing_address = Column(Text)        # JSON string
    shipping_address = Column(Text)       # JSON string

    # Financials
    subtotal = Column(Float)
    grand_total = Column(Float)
    currency = Column(String(10), default="INR")
    payment_method = Column(String(100))

    # Quality
    confidence_score = Column(Float, default=0.0)
    status = Column(String(50), default="processed", index=True)
    # processed | needs_review | error

    # Raw data (for debugging / re-processing)
    raw_text = Column(Text)
    raw_json = Column(Text)               # Full JSON from LLM

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")
    taxes = relationship("TaxEntry", back_populates="invoice", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="invoice", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "file_name": self.file_name,
            "file_hash": self.file_hash,
            "platform": self.platform,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date,
            "order_id": self.order_id,
            "seller_name": self.seller_name,
            "seller_gstin": self.seller_gstin,
            "buyer_name": self.buyer_name,
            "billing_address": self.billing_address,
            "shipping_address": self.shipping_address,
            "subtotal": self.subtotal,
            "grand_total": self.grand_total,
            "currency": self.currency,
            "payment_method": self.payment_method,
            "confidence_score": self.confidence_score,
            "source_type": self.source_type,
            "ocr_confidence": self.ocr_confidence,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    name = Column(String(1000), nullable=False)
    description = Column(Text)
    sku = Column(String(200))
    hsn_code = Column(String(20))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    tax_rate = Column(Float)
    tax_amount = Column(Float)

    invoice = relationship("Invoice", back_populates="line_items")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "hsn_code": self.hsn_code,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_price": self.total_price,
            "tax_rate": self.tax_rate,
            "tax_amount": self.tax_amount,
        }


class TaxEntry(Base):
    __tablename__ = "taxes"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    tax_type = Column(String(20))   # CGST | SGST | IGST | CESS
    rate = Column(Float)
    amount = Column(Float)

    invoice = relationship("Invoice", back_populates="taxes")

    def to_dict(self) -> dict:
        return {"tax_type": self.tax_type, "rate": self.rate, "amount": self.amount}


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    job_id = Column(String(100), index=True)
    file_name = Column(String(500))
    stage = Column(String(50))      # load | ocr | extract | save
    status = Column(String(20))     # ok | error | warning
    message = Column(Text)
    duration_ms = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice", back_populates="processing_logs")
