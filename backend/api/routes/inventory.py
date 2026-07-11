"""
Inventory items CRUD routes.
Items are created automatically when invoices are registered to projects,
and can be viewed, edited, and deleted independently.
"""
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from pydantic import BaseModel

from db.database import get_db
from db.models import InventoryItem, InvoiceProjectAssignment, PWSItem

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


class InventoryItemUpdate(BaseModel):
    item_name: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None


@router.get("/items", response_model=Dict[str, Any])
def list_inventory_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all inventory items with optional search and pagination."""
    q = db.query(InventoryItem)

    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                InventoryItem.item_name.ilike(pattern),
                InventoryItem.invoice_number.ilike(pattern),
                InventoryItem.source_file_name.ilike(pattern),
                InventoryItem.notes.ilike(pattern),
            )
        )

    total = q.count()
    items = q.order_by(desc(InventoryItem.created_at)).offset(skip).limit(limit).all()

    # Batch-fetch project assignments for these invoice IDs (2 queries, no N+1)
    invoice_ids = list({item.invoice_id for item in items})
    assignments = (
        db.query(InvoiceProjectAssignment)
        .filter(InvoiceProjectAssignment.invoice_id.in_(invoice_ids))
        .all()
    ) if invoice_ids else []

    project_ids_needed = list({a.project_id for a in assignments})
    pws_items = (
        db.query(PWSItem)
        .filter(PWSItem.id.in_(project_ids_needed))
        .all()
    ) if project_ids_needed else []
    pws_map = {p.id: p for p in pws_items}

    from collections import defaultdict
    projects_by_invoice = defaultdict(list)
    for a in assignments:
        pws = pws_map.get(a.project_id)
        projects_by_invoice[a.invoice_id].append({
            "project_id": a.project_id,
            "project_code": pws.project_code if pws else None,
            "project_name": pws.name if pws else None,
        })

    def item_with_project(item):
        d = item.to_dict()
        d["project_assignments"] = projects_by_invoice[item.invoice_id]
        return d

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [item_with_project(item) for item in items],
    }


@router.get("/items/{item_id}", response_model=Dict[str, Any])
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """Get a single inventory item by ID."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item.to_dict()


@router.put("/items/{item_id}", response_model=Dict[str, Any])
def update_inventory_item(
    item_id: int,
    update: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    """Update an inventory item's name, notes, or quantities."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if update.item_name is not None:
        item.item_name = update.item_name
    if update.notes is not None:
        item.notes = update.notes
    if update.quantity is not None:
        item.quantity = update.quantity
    if update.unit_price is not None:
        item.unit_price = update.unit_price
    if update.total_amount is not None:
        item.total_amount = update.total_amount

    db.commit()
    db.refresh(item)
    return item.to_dict()


@router.delete("/items/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an inventory item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(item)
    db.commit()
    return {"message": "Inventory item deleted"}