"""
Repository layer — all database CRUD operations for invoices.
"""
import json
import logging
from typing import Optional

from sqlalchemy import desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db.models import Invoice, LineItem, TaxEntry, ProcessingLog
from models.invoice_schema import InvoiceExtracted
from core.document_loader import DocumentResult

logger = logging.getLogger(__name__)


class InvoiceRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Deduplication ─────────────────────────────────────────────────────────

    def exists_by_hash(self, file_hash: str) -> Optional[Invoice]:
        """Return existing invoice if same file was already processed."""
        return self.db.query(Invoice).filter(Invoice.file_hash == file_hash).first()

    # ── Create ────────────────────────────────────────────────────────────────

    def save_invoice(
        self,
        doc_result: DocumentResult,
        extracted: InvoiceExtracted,
        job_id: str = "",
    ) -> Invoice:
        """
        Persist a fully extracted invoice with its line items and taxes.
        Returns the created Invoice ORM object.
        """
        # Determine status: all newly uploaded invoices must be registered/reviewed
        status = "needs_review"

        invoice = Invoice(
            file_name=doc_result.file_name,
            file_path=doc_result.file_path,
            file_hash=doc_result.file_hash,
            file_size_bytes=doc_result.file_size_bytes,
            page_count=doc_result.page_count,
            source_type=doc_result.source_type,
            ocr_confidence=doc_result.ocr_confidence,
            invoice_number=extracted.invoice_number,
            invoice_date=str(extracted.invoice_date) if extracted.invoice_date else None,
            invoice_details=extracted.invoice_details,
            pan_no=extracted.pan_no,
            cin_no=extracted.cin_no,
            gst_registration_no=extracted.gst_registration_no,
            grand_total=sum((li.total_amount or 0) for li in extracted.line_items) if extracted.line_items else 0.0,
            confidence_score=extracted.confidence_score,
            status=status,
            raw_text=doc_result.raw_text[:50000],  # Cap raw text
            raw_json=extracted.model_dump_json(),
        )

        from core.embeddings import get_embedding
        invoice.embedding = get_embedding(doc_result.raw_text[:20000])

        self.db.add(invoice)
        self.db.flush()  # Get ID without committing

        # Save line items
        for item in extracted.line_items:
            db_item = LineItem(
                invoice_id=invoice.id,
                name=item.name,
                hsn_code=item.hsn_code,
                quantity=item.quantity,
                unit_price=item.unit_price,
                net_amount=item.net_amount,
                tax_rate=item.tax_rate,
                tax_type=item.tax_type,
                tax_amount=item.tax_amount,
                total_amount=item.total_amount,
            )
            self.db.add(db_item)

        try:
            self.db.commit()
            self.db.refresh(invoice)
            logger.info(f"Saved invoice id={invoice.id} ({invoice.file_name})")
            return invoice
        except IntegrityError:
            # Race condition: another concurrent request already inserted this hash.
            # Rollback and return the existing record as a duplicate.
            self.db.rollback()
            existing = self.exists_by_hash(doc_result.file_hash)
            if existing:
                logger.info(f"Duplicate detected (race): {doc_result.file_name} → id={existing.id}")
                return existing
            raise  # Unexpected IntegrityError on a different column

    def save_error(
        self,
        doc_result: Optional[DocumentResult],
        file_name: str,
        file_hash: str,
        error_msg: str,
        job_id: str = "",
    ) -> ProcessingLog:
        """Log a failed processing attempt."""
        log = ProcessingLog(
            job_id=job_id,
            file_name=file_name,
            stage="error",
            status="error",
            message=error_msg[:2000],
        )
        self.db.add(log)
        self.db.commit()
        return log

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_invoice(self, invoice_id: int) -> Optional[Invoice]:
        return self.db.query(Invoice).filter(Invoice.id == invoice_id).first()

    def list_invoices(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[Invoice], int]:
        """Returns (invoices, total_count)."""
        q = self.db.query(Invoice)

        if status:
            q = q.filter(Invoice.status == status)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                or_(
                    Invoice.invoice_number.ilike(pattern),
                    Invoice.order_id.ilike(pattern),
                )
            )

        total = q.count()
        invoices = q.order_by(desc(Invoice.id)).offset(skip).limit(limit).all()
        return invoices, total

    def get_all_for_export(
        self,
        status: Optional[str] = None,
    ) -> list[Invoice]:
        """Fetch all invoices for CSV/Excel export (no pagination)."""
        q = self.db.query(Invoice)
        if status:
            q = q.filter(Invoice.status == status)
        return q.order_by(desc(Invoice.id)).all()

    # ── Update ────────────────────────────────────────────────────────────────

    def update_invoice(self, invoice_id: int, updates: dict) -> Optional[Invoice]:
        """Apply manual field corrections from the UI."""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return None
        allowed = {
            "invoice_number", "invoice_date", "invoice_details",
            "gst_registration_no", "pan_no", "cin_no",
            "status", "category",
        }
        for key, val in updates.items():
            if key in allowed:
                setattr(invoice, key, val)
        
        if "line_items" in updates:
            # Delete old line items
            for old_li in invoice.line_items:
                self.db.delete(old_li)
            
            # Add new ones
            from db.models import LineItem
            new_grand_total = 0.0
            for item_data in updates["line_items"]:
                li = LineItem(
                    invoice_id=invoice.id,
                    name=item_data.get("name", ""),
                    hsn_code=item_data.get("hsn_code"),
                    quantity=float(item_data.get("quantity") or 1.0),
                    unit_price=float(item_data.get("unit_price") or 0.0),
                    net_amount=float(item_data.get("net_amount") or 0.0),
                    tax_rate=float(item_data.get("tax_rate") or 0.0) if item_data.get("tax_rate") else None,
                    tax_type=item_data.get("tax_type"),
                    tax_amount=float(item_data.get("tax_amount") or 0.0) if item_data.get("tax_amount") else None,
                    total_amount=float(item_data.get("total_amount") or 0.0),
                )
                self.db.add(li)
                new_grand_total += li.total_amount
            
            invoice.grand_total = new_grand_total

        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_invoice(self, invoice_id: int) -> bool:
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return False
        self.db.delete(invoice)
        self.db.commit()
        return True

    # ── Statistics ────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        total = self.db.query(func.count(Invoice.id)).scalar() or 0
        total_spend = self.db.query(func.sum(Invoice.grand_total)).scalar() or 0.0
        needs_review = (
            self.db.query(func.count(Invoice.id))
            .filter(Invoice.status == "needs_review")
            .scalar() or 0
        )

        # Spend by month
        by_month_rows = (
            self.db.query(
                func.strftime("%Y-%m", Invoice.invoice_date).label("month"),
                func.count(Invoice.id),
                func.sum(Invoice.grand_total),
            )
            .group_by("month")
            .order_by("month")
            .all()
        )
        by_month = [
            {"month": r[0], "count": r[1], "total": round(r[2] or 0, 2)}
            for r in by_month_rows
        ]

        return {
            "total_invoices": total,
            "total_spend": round(total_spend, 2),
            "by_month": by_month,
            "needs_review_count": needs_review,
        }
