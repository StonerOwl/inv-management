from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.database import get_db
from db.models import Invoice, PWSItem, Note
from api.dependencies import get_current_active_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", dependencies=[Depends(get_current_active_user)])
def get_dashboard(db: Session = Depends(get_db)):
    # ── Invoice counts ────────────────────────────────────────────────────────
    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0

    invoice_status_rows = (
        db.query(Invoice.status, func.count(Invoice.id))
        .group_by(Invoice.status)
        .all()
    )
    invoice_by_status = {row[0]: row[1] for row in invoice_status_rows}

    # ── Inventory: line items across all invoices ─────────────────────────────
    from db.models import LineItem
    total_line_items = db.query(func.count(LineItem.id)).scalar() or 0

    # ── PWS counts ────────────────────────────────────────────────────────────
    pws_counts = {}
    for pws_type in ["project", "workflow", "stage", "process"]:
        pws_counts[pws_type] = (
            db.query(func.count(PWSItem.id))
            .filter(PWSItem.type == pws_type)
            .scalar() or 0
        )

    # ── Notes count ───────────────────────────────────────────────────────────
    total_notes = db.query(func.count(Note.id)).scalar() or 0

    # ── Project overview table ────────────────────────────────────────────────
    from db.models import PWSAssignment, InvoiceProjectAssignment
    projects = db.query(PWSItem).filter(PWSItem.type == "project").all()

    project_rows = []
    for project in projects:
        invoice_assignments = (
            db.query(InvoiceProjectAssignment)
            .filter_by(project_id=project.id)
            .all()
        )
        invoice_ids = [a.invoice_id for a in invoice_assignments]
        invoices = (
            db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all()
            if invoice_ids else []
        )

        total_qty = sum(
            sum(li.quantity or 0 for li in inv.line_items)
            for inv in invoices
        )
        total_value = sum(inv.grand_total or 0 for inv in invoices)

        statuses = [inv.status for inv in invoices]
        if all(s == "processed" for s in statuses) and statuses:
            status = "Completed"
        elif any(s == "needs_review" for s in statuses):
            status = "Needs Review"
        elif statuses:
            status = "Active"
        else:
            status = "Planning"

        latest_date = None
        for inv in invoices:
            if inv.invoice_date:
                latest_date = inv.invoice_date

        products = list({inv.invoice_number or inv.file_name for inv in invoices})
        product_label = products[0] if products else project.product or "N/A"

        project_rows.append({
            "batch_id": project.project_code or project.id,
            "project_name": project.name,
            "product": project.product or product_label,
            "total_invoices": len(invoices),
            "total_qty": round(total_qty, 2),
            "total_value": round(total_value, 2),
            "status": status,
            "updated_on": latest_date or (project.created_at.strftime("%b %d, %Y") if project.created_at else "N/A"),
        })

    # ── Recent activity: newest invoices ──────────────────────────────────────
    recent_invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .limit(5)
        .all()
    )
    recent = [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number or inv.file_name,
            "status": inv.status,
            "grand_total": inv.grand_total,
            "invoice_date": inv.invoice_date,
        }
        for inv in recent_invoices
    ]

    return {
        "invoices": {
            "total": total_invoices,
            "by_status": invoice_by_status,
        },
        "inventory": {
            "total_line_items": total_line_items,
        },
        "pws": pws_counts,
        "notes": {
            "total": total_notes,
        },
        "project_overview": project_rows,
        "recent_invoices": recent,
    }