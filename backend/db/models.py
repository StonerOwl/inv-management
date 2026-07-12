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
    role = Column(String(20), default="user")
    can_upload = Column(Boolean, default=False)
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
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    file_size_bytes = Column(Integer)
    page_count = Column(Integer)
    source_type = Column(String(50))
    ocr_confidence = Column(Float)
    invoice_number = Column(String(200), index=True)
    invoice_date = Column(String(50))
    invoice_details = Column(String(200), nullable=True)
    gst_registration_no = Column(String(50))
    pan_no = Column(String(50))
    cin_no = Column(String(50))
    grand_total = Column(Float)
    category = Column(String(50), nullable=True)
    tracking_category_override = Column(String(100), nullable=True)
    confidence_score = Column(Float, default=0.0)
    status = Column(String(50), default="processed", index=True)
    raw_text = Column(Text)
    raw_json = Column(Text)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")
    taxes = relationship("TaxEntry", back_populates="invoice", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="invoice", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
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
    tax_type = Column(String(20))
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
    stage = Column(String(50))
    status = Column(String(20))
    message = Column(Text)
    duration_ms = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice", back_populates="processing_logs")


class ProductCatalog(Base):
    __tablename__ = "product_catalog"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(500), unique=True, nullable=False, index=True)
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, default="Category 1")
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
    color = Column(String(30), nullable=False, default="cyan")
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
    type = Column(String(20), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    project_code = Column(String(50), nullable=True)
    batch_id = Column(String(50), nullable=True)
    product = Column(String(200), nullable=True)
    work_order = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    start_date = Column(String(50), nullable=True)
    target_date = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    allowed_image_types = Column(Text, nullable=True)  # JSON-encoded list e.g. '["Visual","NIR"]'
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        try:
            parsed_types = json.loads(self.allowed_image_types) if self.allowed_image_types else []
        except Exception:
            parsed_types = []
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
            "allowed_image_types": parsed_types,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "completed_by": self.completed_by,
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


class StageItemLink(Base):
    """Links a PWS stage to an inventory item for workflow management."""
    __tablename__ = "stage_item_links"

    id = Column(Integer, primary_key=True, index=True)
    stage_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_allocated = Column(Float, default=0.0, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("stage_id", "inventory_item_id", name="uq_stage_item_link"),
    )

    stage = relationship("PWSItem", foreign_keys=[stage_id])
    inventory_item = relationship("InventoryItem")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "stage_id": self.stage_id,
            "inventory_item_id": self.inventory_item_id,
            "quantity_allocated": self.quantity_allocated,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
    target_type = Column(String(50), index=True, nullable=False)
    target_id = Column(String(50), index=True, nullable=False)
    content = Column(Text, nullable=False)
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
    file_type = Column(String(100), nullable=True)

    note = relationship("Note", back_populates="attachments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "note_id": self.note_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_type": self.file_type
        }


class InventoryItem(Base):
    """
    Represents an item added to inventory from a parsed invoice.
    Created automatically when an invoice is registered to a project.
    Each row corresponds to a line item extracted from the invoice PDF via Ollama.
    """
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(1000), nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    hsn_code = Column(String(255), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(200), nullable=True)
    source_file_name = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    invoice = relationship("Invoice")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_name": self.item_name,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_amount": self.total_amount,
            "hsn_code": self.hsn_code,
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice_number,
            "source_file_name": self.source_file_name,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    subtype = Column(String(100), nullable=True)
    interface = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Online")
    linked_process = Column(Text, nullable=True)
    quality_notes_count = Column(Integer, default=0)
    last_sync_mins_ago = Column(Integer, default=1)
    calibration_due_days = Column(Integer, nullable=True)
    signal_quality = Column(Float, nullable=True)
    device_health = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    power_battery = Column(Float, nullable=True)
    uptime_percentage = Column(Float, nullable=True)
    data_throughput_mbps = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "subtype": self.subtype,
            "interface": self.interface,
            "status": self.status,
            "linked_process": self.linked_process,
            "quality_notes_count": self.quality_notes_count,
            "last_sync_mins_ago": self.last_sync_mins_ago,
            "calibration_due_days": self.calibration_due_days,
            "signal_quality": self.signal_quality,
            "device_health": self.device_health,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "power_battery": self.power_battery,
            "uptime_percentage": self.uptime_percentage,
            "data_throughput_mbps": self.data_throughput_mbps,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityLog(Base):
    """
    System-wide activity log — one row per meaningful action taken in the
    app (device added, project/workflow/stage/process created, invoice
    uploaded, inventory linked, stage completed, etc). Powers the
    Monitoring > Logs and Monitoring > Alerts screens.
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    action = Column(String(100), nullable=False, index=True)     # e.g. "device_created"
    category = Column(String(50), nullable=False, index=True)    # e.g. "device", "project", "invoice"
    severity = Column(String(20), nullable=False, default="info", index=True)  # info | success | warning | error
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(100), nullable=True)
    entity_name = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    username = Column(String(200), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "action": self.action,
            "category": self.category,
            "severity": self.severity,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "description": self.description,
            "username": self.username,
        }


class NotificationRecipient(Base):
    """An email address configured to receive notifications for chosen event types."""
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), nullable=False)
    label = Column(String(200), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    subscribed_events = Column(Text, nullable=True)  # JSON-encoded list of event-type keys
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        try:
            events = json.loads(self.subscribed_events) if self.subscribed_events else []
        except Exception:
            events = []
        return {
            "id": self.id,
            "email": self.email,
            "label": self.label,
            "active": self.active,
            "subscribed_events": events,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class NotificationLog(Base):
    """History of notification emails the system attempted to send."""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    sent_at = Column(DateTime, server_default=func.now(), index=True)
    event_type = Column(String(100), nullable=False, index=True)
    subject = Column(String(500), nullable=True)
    recipient_email = Column(String(320), nullable=False)
    status = Column(String(20), nullable=False, default="sent")  # sent | failed | skipped
    error = Column(Text, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "event_type": self.event_type,
            "subject": self.subject,
            "recipient_email": self.recipient_email,
            "status": self.status,
            "error": self.error,
        }