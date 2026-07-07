"""
SQLAlchemy ORM models for the invoice database.
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean, UniqueConstraint, func
)
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="user")  # "admin" or "user"
    can_upload = Column(Boolean, default=False)  # User permission to upload
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "can_upload": self.can_upload,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }


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
    invoice_number = Column(String(200), index=True)
    invoice_date = Column(String(50))
    invoice_details = Column(String(200), nullable=True)

    # Seller
    gst_registration_no = Column(String(50))
    pan_no = Column(String(50))
    cin_no = Column(String(50))

    # Financials
    grand_total = Column(Float)
    
    # Custom Categories
    category = Column(String(50), nullable=True)
    
    # Tracking workflow override — when set, uses this category's workflows instead of PO category
    tracking_category_override = Column(String(100), nullable=True)

    # Quality
    confidence_score = Column(Float, default=0.0)
    status = Column(String(50), default="processed", index=True)
    # processed | needs_review | error

    # Raw data (for debugging / re-processing)
    raw_text = Column(Text)
    raw_json = Column(Text)               # Full JSON from LLM

    # AI Search capabilities
    embedding = Column(Vector(768), nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")
    taxes = relationship("TaxEntry", back_populates="invoice", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="invoice", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        # Flatten line items into summary fields
        return {
            "id": self.id,
            "file_hash": self.file_hash,
            "file_name": self.file_name,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date,
            "invoice_details": self.invoice_details,
            "pan_no": self.pan_no,
            "cin_no": self.cin_no,
            "gst_registration_no": self.gst_registration_no,
            "grand_total": self.grand_total,
            "category": self.category,
            "confidence_score": self.confidence_score,
            "source_type": self.source_type,
            "ocr_confidence": self.ocr_confidence,
            "status": self.status,
            "line_items": [li.to_dict() for li in self.line_items] if self.line_items else []
        }


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    name = Column(String(1000), nullable=False)
    hsn_code = Column(String(255))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    net_amount = Column(Float, default=0.0)
    tax_rate = Column(Float)
    tax_type = Column(String(50))
    tax_amount = Column(Float)
    total_amount = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="line_items")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "hsn_code": self.hsn_code,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "net_amount": self.net_amount,
            "tax_rate": self.tax_rate,
            "tax_type": self.tax_type,
            "tax_amount": self.tax_amount,
            "total_amount": self.total_amount,
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


class ProductCatalog(Base):
    __tablename__ = "product_catalog"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(500), unique=True, nullable=False, index=True)
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, default="Category 1")  # Category name string
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    workflow = relationship("Workflow", back_populates="products")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_name": self.item_name,
            "item_code": self.item_code,
            "category": self.category,
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow.name if self.workflow else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    color = Column(String(30), nullable=False, default="cyan")  # cyan | purple | orange | emerald | rose | amber
    created_at = Column(DateTime, server_default=func.now())

    workflows = relationship("Workflow", back_populates="category", cascade="all, delete-orphan", order_by="Workflow.order_index")

    def to_dict(self, include_workflows=True) -> dict:
        result = {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_workflows:
            result["workflows"] = [w.to_dict() for w in self.workflows]
        return result


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("Category", back_populates="workflows")
    processes = relationship("WorkflowProcess", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowProcess.order_index")
    products = relationship("ProductCatalog", back_populates="workflow")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "order_index": self.order_index,
            "processes": [p.to_dict() for p in self.processes],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkflowProcess(Base):
    __tablename__ = "workflow_processes"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    workflow = relationship("Workflow", back_populates="processes")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "order_index": self.order_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class InvoiceProcessTracking(Base):
    """Tracks which process steps an invoice has completed in its workflow."""
    __tablename__ = "invoice_process_tracking"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("workflow_processes.id"), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice")
    process = relationship("WorkflowProcess")
    completed_by = relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else None,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "completed_by_id": self.completed_by_id,
            "completed_by_username": self.completed_by.username if self.completed_by else None,
            "notes": self.notes,
        }


class PWSItem(Base):
    __tablename__ = "pws_items"

    id = Column(String(50), primary_key=True, index=True)
    type = Column(String(20), index=True, nullable=False) # 'project', 'workflow', 'stage', 'process'
    name = Column(String(200), nullable=False)
    project_code = Column(String(50), nullable=True) # E.g., PRSJ-2026-001-B001 (Project ID)
    batch_id = Column(String(50), nullable=True)     # E.g., PBSJ-2026-001
    product = Column(String(200), nullable=True)
    work_order = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    start_date = Column(String(50), nullable=True)
    target_date = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "project_code": self.project_code,
            "batch_id": self.batch_id,
            "product": self.product,
            "work_order": self.work_order,
            "category": self.category,
            "start_date": self.start_date,
            "target_date": self.target_date,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PWSAssignment(Base):
    __tablename__ = "pws_assignments"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), index=True, nullable=False)
    child_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), index=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "child_id": self.child_id,
        }


class InvoiceProjectAssignment(Base):
    __tablename__ = "invoice_project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("invoice_id", "project_id", name="uq_invoice_project_assignment"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String(50), index=True, nullable=False)  # 'invoice', 'workflow', etc.
    target_id = Column(String(50), index=True, nullable=False)    # allow strings (like workflow ids)
    content = Column(Text, nullable=False)
    
    # Search & AI capabilities
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    attachments = relationship("NoteAttachment", back_populates="note", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else "Unknown",
            "target_type": self.target_type,
            "target_id": self.target_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "attachments": [a.to_dict() for a in self.attachments] if self.attachments else []
        }

class NoteAttachment(Base):
    __tablename__ = "note_attachments"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(100), nullable=True) # mime type
    
    note = relationship("Note", back_populates="attachments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "note_id": self.note_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_type": self.file_type
        }
