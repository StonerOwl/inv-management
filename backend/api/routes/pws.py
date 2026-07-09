from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.dependencies import get_db
from db.models import PWSItem, PWSAssignment, Invoice, InvoiceProjectAssignment, InventoryItem, LineItem

router = APIRouter(prefix="/pws", tags=["PWS Management"])

from datetime import datetime

class PWSItemCreate(BaseModel):
    id: str
    type: str
    name: str
    product: Optional[str] = None
    work_order: Optional[str] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    location: Optional[str] = None

class PWSAssignmentCreate(BaseModel):
    parent_id: str
    child_id: str


class InvoiceProjectAssignmentCreate(BaseModel):
    invoice_id: int
    project_id: str
    selected_line_item_ids: Optional[List[int]] = None


@router.get("/items", response_model=List[Dict[str, Any]])
def get_pws_items(db: Session = Depends(get_db)):
    items = db.query(PWSItem).all()
    return [item.to_dict() for item in items]

@router.get("/invoice-project/all")
def get_all_invoice_assignments(db: Session = Depends(get_db)):
    assignments = db.query(InvoiceProjectAssignment).all()
    return [{"invoice_id": a.invoice_id, "project_id": a.project_id} for a in assignments]

@router.post("/items", response_model=Dict[str, Any])
def create_pws_item(item: PWSItemCreate, db: Session = Depends(get_db)):
    db_item = PWSItem(
        id=item.id,
        type=item.type,
        name=item.name,
        product=item.product,
        work_order=item.work_order,
        category=item.category,
        start_date=item.start_date,
        target_date=item.target_date,
        location=item.location
    )
    
    if item.type == 'project':
        current_year = datetime.now().year
        count = db.query(PWSItem).filter(PWSItem.type == 'project').count()
        seq = count + 1
        project_id = f"PRSJ-{current_year}-{seq:03d}-B001"
        db_item.project_code = project_id

    if item.type == 'workflow':
        current_year = datetime.now().year
        count = db.query(PWSItem).filter(PWSItem.type == 'workflow').count()
        seq = count + 1
        batch_id = f"PBSJ-{current_year}-{seq:03d}"
        db_item.batch_id = batch_id

    db.add(db_item)
    try:
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_item.to_dict()

class PWSItemUpdate(BaseModel):
    name: Optional[str] = None
    product: Optional[str] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    batch_id: Optional[str] = None
    project_code: Optional[str] = None

@router.put("/items/{item_id}", response_model=Dict[str, Any])
def update_pws_item(item_id: str, update: PWSItemUpdate, db: Session = Depends(get_db)):
    item = db.query(PWSItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if update.name is not None:
        item.name = update.name
    if update.product is not None:
        item.product = update.product
    if update.category is not None:
        item.category = update.category
    if update.start_date is not None:
        item.start_date = update.start_date
    if update.target_date is not None:
        item.target_date = update.target_date
    if update.batch_id is not None:
        item.batch_id = update.batch_id
    if update.project_code is not None:
        item.project_code = update.project_code
        
    db.commit()
    db.refresh(item)
    return item.to_dict()

@router.get("/assignments", response_model=List[Dict[str, Any]])
def get_pws_assignments(db: Session = Depends(get_db)):
    assignments = db.query(PWSAssignment).all()
    return [assignment.to_dict() for assignment in assignments]


@router.post("/invoice-project", response_model=Dict[str, Any])
def assign_invoice_to_project(assign: InvoiceProjectAssignmentCreate, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter_by(id=assign.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    project = db.query(PWSItem).filter_by(id=assign.project_id, type="project").first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = db.query(InvoiceProjectAssignment).filter_by(
        invoice_id=assign.invoice_id,
        project_id=assign.project_id,
    ).first()
    if existing:
        return existing.to_dict()

    assignment = InvoiceProjectAssignment(invoice_id=assign.invoice_id, project_id=assign.project_id)
    db.add(assignment)

    # ── Auto-create inventory items from the invoice's parsed line items ──
    # Only create if no inventory items exist yet for this invoice (idempotent)
    existing_inventory = db.query(InventoryItem).filter_by(invoice_id=invoice.id).count()
    if existing_inventory == 0:
        if assign.selected_line_item_ids is not None:
            line_items = db.query(LineItem).filter(
                LineItem.invoice_id == invoice.id,
                LineItem.id.in_(assign.selected_line_item_ids)
            ).all()
        else:
            line_items = db.query(LineItem).filter_by(invoice_id=invoice.id).all()
            
        for li in line_items:
                
            inv_item = InventoryItem(
                item_name=li.name,
                quantity=li.quantity or 1.0,
                unit_price=li.unit_price or 0.0,
                total_amount=li.total_amount or 0.0,
                hsn_code=li.hsn_code,
                invoice_id=invoice.id,
                invoice_number=invoice.invoice_number,
                source_file_name=invoice.file_name,
            )
            db.add(inv_item)

    try:
        db.commit()
        db.refresh(assignment)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    return assignment.to_dict()


@router.get("/projects/{project_id}/analytics")
def get_project_analytics(project_id: str, db: Session = Depends(get_db)):
    project = db.query(PWSItem).filter_by(id=project_id, type="project").first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    workflow_assignments = db.query(PWSAssignment).filter_by(parent_id=project_id).all()
    workflow_ids = [a.child_id for a in workflow_assignments if a.child_id]
    workflows = db.query(PWSItem).filter(PWSItem.id.in_(workflow_ids), PWSItem.type == "workflow").all()

    workflow_details = []
    for workflow in workflows:
        stage_assignments = db.query(PWSAssignment).filter_by(parent_id=workflow.id).all()
        stage_ids = [a.child_id for a in stage_assignments if a.child_id]
        stages = db.query(PWSItem).filter(PWSItem.id.in_(stage_ids), PWSItem.type == "stage").all()

        stage_details = []
        for stage in stages:
            process_assignments = db.query(PWSAssignment).filter_by(parent_id=stage.id).all()
            process_ids = [a.child_id for a in process_assignments if a.child_id]
            processes = db.query(PWSItem).filter(PWSItem.id.in_(process_ids), PWSItem.type == "process").all()

            stage_details.append({
                "id": stage.id,
                "name": stage.name,
                "processes": [{"id": p.id, "name": p.name} for p in processes],
            })

        workflow_details.append({
            "id": workflow.id,
            "name": workflow.name,
            "stages": stage_details,
        })

    invoice_assignments = db.query(InvoiceProjectAssignment).filter_by(project_id=project_id).order_by(InvoiceProjectAssignment.created_at.desc()).all()
    invoice_ids = [a.invoice_id for a in invoice_assignments]
    invoices = db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all() if invoice_ids else []

    invoice_summaries = []
    for invoice in invoices:
        line_names = [line.name for line in invoice.line_items if line.name][:3]
        description = "; ".join(line_names) if line_names else None
        if invoice.status == "processed":
            progress = 100
        elif invoice.status == "needs_review":
            progress = 50
        else:
            progress = 0

        first_stage_name = (
            workflow_details[0]["stages"][0]["name"]
            if workflow_details and workflow_details[0].get("stages")
            else "Not started"
        )

        invoice_summaries.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number or f"Batch #{invoice.id}",
            "file_name": invoice.file_name,
            "description": description,
            "status": invoice.status,
            "grand_total": invoice.grand_total,
            "progress": progress,
            "current_stage": first_stage_name,
        })

    return {
        "project": project.to_dict(),
        "workflows": workflow_details,
        "invoices": invoice_summaries,
    }


@router.post("/assignments", response_model=Dict[str, Any])
def create_pws_assignment(assign: PWSAssignmentCreate, db: Session = Depends(get_db)):
    # Check if already exists
    existing = db.query(PWSAssignment).filter_by(parent_id=assign.parent_id, child_id=assign.child_id).first()
    if existing:
        return existing.to_dict()

    db_assign = PWSAssignment(parent_id=assign.parent_id, child_id=assign.child_id)
    db.add(db_assign)
    try:
        db.commit()
        db.refresh(db_assign)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_assign.to_dict()

@router.delete("/assignments/{parent_id}/{child_id}")
def delete_pws_assignment(parent_id: str, child_id: str, db: Session = Depends(get_db)):
    assignment = db.query(PWSAssignment).filter_by(parent_id=parent_id, child_id=child_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return {"status": "success"}

@router.delete("/items/{item_id}")
def delete_pws_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(PWSItem).filter(PWSItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Also delete associated assignments where this item is parent or child
    db.query(PWSAssignment).filter((PWSAssignment.parent_id == item_id) | (PWSAssignment.child_id == item_id)).delete()
    
    db.delete(item)
    db.commit()
    return {"status": "success"}
