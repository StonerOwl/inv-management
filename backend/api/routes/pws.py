from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.dependencies import get_db
from db.models import PWSItem, PWSAssignment, Invoice, InvoiceProjectAssignment

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


@router.get("/items", response_model=List[Dict[str, Any]])
def get_pws_items(db: Session = Depends(get_db)):
    items = db.query(PWSItem).all()
    return [item.to_dict() for item in items]

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
        # Count existing projects for this year to get sequential number
        # A simple approach is just counting all projects and adding 1, since this is a demo
        count = db.query(PWSItem).filter(PWSItem.type == 'project').count()
        seq = count + 1
        
        # E.g. PRSJ-2026-001-B001
        project_id = f"PRSJ-{current_year}-{seq:03d}-B001"
        # E.g. PBSJ-2026-001
        batch_id = f"PBSJ-{current_year}-{seq:03d}"
        
        db_item.project_code = project_id
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
    project_code: str

@router.put("/items/{item_id}", response_model=Dict[str, Any])
def update_pws_item(item_id: str, update: PWSItemUpdate, db: Session = Depends(get_db)):
    item = db.query(PWSItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
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
    workflow_ids = [assignment.child_id for assignment in workflow_assignments if assignment.child_id]
    workflows = db.query(PWSItem).filter(PWSItem.id.in_(workflow_ids), PWSItem.type == "workflow").all()

    workflow_details = []
    for workflow in workflows:
        state_assignments = db.query(PWSAssignment).filter_by(parent_id=workflow.id).all()
        state_ids = [assignment.child_id for assignment in state_assignments if assignment.child_id]
        states = db.query(PWSItem).filter(PWSItem.id.in_(state_ids), PWSItem.type == "state").all()
        workflow_details.append({
            "id": workflow.id,
            "name": workflow.name,
            "states": [{"id": state.id, "name": state.name} for state in states],
        })

    invoice_assignments = db.query(InvoiceProjectAssignment).filter_by(project_id=project_id).order_by(InvoiceProjectAssignment.created_at.desc()).all()
    invoice_ids = [assignment.invoice_id for assignment in invoice_assignments]
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

        invoice_summaries.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number or f"Batch #{invoice.id}",
            "file_name": invoice.file_name,
            "description": description,
            "status": invoice.status,
            "grand_total": invoice.grand_total,
            "progress": progress,
            "current_stage": workflow_details[0]["states"][0]["name"] if workflow_details and workflow_details[0].get("states") else "Not started",
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
