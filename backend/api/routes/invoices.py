"""
Invoice CRUD routes + search + CSV/Excel export.
"""
import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.database import get_db
from db.repository import InvoiceRepository

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("")
def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    platform: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = InvoiceRepository(db)
    invoices, total = repo.list_invoices(
        skip=skip, limit=limit, platform=platform, status=status, search=search
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                **inv.to_dict(),
                "line_items": [li.to_dict() for li in inv.line_items],
                "taxes": [t.to_dict() for t in inv.taxes],
            }
            for inv in invoices
        ],
    }


# ── Export routes MUST be declared before /{invoice_id} to avoid
#    FastAPI matching "export" as an invoice_id path parameter. ────────────────

@router.get("/export/csv")
def export_csv(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    repo = InvoiceRepository(db)
    invoices = repo.get_all_for_export(platform=platform, status=status)

    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "ID", "File Name", "Platform", "Invoice Number", "Invoice Date",
        "Order ID", "Seller Name", "Seller GSTIN", "Buyer Name",
        "Billing Address", "Shipping Address", "Subtotal", "Grand Total",
        "Currency", "Payment Method", "Confidence Score", "Status", "Created At",
    ]
    writer.writerow(headers)

    for inv in invoices:
        writer.writerow([
            inv.id, inv.file_name, inv.platform, inv.invoice_number,
            inv.invoice_date, inv.order_id, inv.seller_name, inv.seller_gstin,
            inv.buyer_name, inv.billing_address, inv.shipping_address,
            inv.subtotal, inv.grand_total, inv.currency, inv.payment_method,
            inv.confidence_score, inv.status,
            inv.created_at.isoformat() if inv.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices.csv"},
    )


@router.get("/export/excel")
def export_excel(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    repo = InvoiceRepository(db)
    invoices = repo.get_all_for_export(platform=platform, status=status)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Invoices"

    headers = [
        "ID", "File Name", "Platform", "Invoice Number", "Invoice Date",
        "Order ID", "Seller Name", "Seller GSTIN", "Buyer Name",
        "Billing Address", "Shipping Address", "Subtotal", "Grand Total",
        "Currency", "Payment Method", "Confidence Score", "Status", "Created At",
    ]

    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    for inv in invoices:
        ws.append([
            inv.id, inv.file_name, inv.platform, inv.invoice_number,
            inv.invoice_date, inv.order_id, inv.seller_name, inv.seller_gstin,
            inv.buyer_name, inv.billing_address, inv.shipping_address,
            inv.subtotal, inv.grand_total, inv.currency, inv.payment_method,
            inv.confidence_score, inv.status,
            inv.created_at.isoformat() if inv.created_at else "",
        ])

    # Auto-width columns
    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col), default=10)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 2, 50)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=invoices.xlsx"},
    )


# ── Parameterized routes (must come after literal paths like /export/*) ──────

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    repo = InvoiceRepository(db)
    inv = repo.get_invoice(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        **inv.to_dict(),
        "raw_text": inv.raw_text,
        "line_items": [li.to_dict() for li in inv.line_items],
        "taxes": [t.to_dict() for t in inv.taxes],
    }


@router.put("/{invoice_id}")
def update_invoice(invoice_id: int, updates: dict, db: Session = Depends(get_db)):
    repo = InvoiceRepository(db)
    inv = repo.update_invoice(invoice_id, updates)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv.to_dict()


@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    repo = InvoiceRepository(db)
    ok = repo.delete_invoice(invoice_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Deleted"}



