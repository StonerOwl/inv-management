from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.dependencies import get_db
from db.models import PWSItem, PWSAssignment, Invoice, InvoiceProjectAssignment, InventoryItem, LineItem, StageItemLink
from db.quality_models import QualityNote, QualityAttachment
from core.activity_log import log_activity

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
    allowed_image_types: Optional[List[str]] = None

class PWSAssignmentCreate(BaseModel):
    parent_id: str
    child_id: str


class InvoiceProjectAssignmentCreate(BaseModel):
    invoice_id: int
    project_id: str
    selected_line_item_ids: Optional[List[int]] = None


class StageItemLinkCreate(BaseModel):
    stage_id: str
    inventory_item_id: int
    quantity_allocated: Optional[float] = None
    notes: Optional[str] = None


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
    import json as _json
    db_item = PWSItem(
        id=item.id,
        type=item.type,
        name=item.name,
        product=item.product,
        work_order=item.work_order,
        category=item.category,
        start_date=item.start_date,
        target_date=item.target_date,
        location=item.location,
        allowed_image_types=_json.dumps(item.allowed_image_types) if item.allowed_image_types else None
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

    action_by_type = {
        "project": "project_created",
        "workflow": "workflow_created",
        "stage": "stage_created",
        "process": "process_created",
    }
    action = action_by_type.get(item.type)
    if action:
        log_activity(
            db,
            action=action,
            category="project" if item.type == "project" else "workflow",
            severity="success",
            entity_type=item.type,
            entity_id=db_item.id,
            entity_name=db_item.name,
            description=f"{item.type.capitalize()} '{db_item.name}' was created.",
        )
    return db_item.to_dict()

class PWSItemUpdate(BaseModel):
    name: Optional[str] = None
    product: Optional[str] = None
    category: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    batch_id: Optional[str] = None
    project_code: Optional[str] = None
    allowed_image_types: Optional[List[str]] = None

@router.put("/items/{item_id}", response_model=Dict[str, Any])
def update_pws_item(item_id: str, update: PWSItemUpdate, db: Session = Depends(get_db)):
    import json as _json
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
    if update.allowed_image_types is not None:
        item.allowed_image_types = _json.dumps(update.allowed_image_types) if update.allowed_image_types else None
        
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

    log_activity(
        db,
        action="invoice_linked_to_project",
        category="invoice",
        severity="success",
        entity_type="invoice",
        entity_id=invoice.id,
        entity_name=invoice.invoice_number or invoice.file_name,
        description=f"Invoice '{invoice.invoice_number or invoice.file_name}' was linked to project '{project.name}'.",
    )

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

            # Linked inventory items for this stage
            stage_links = db.query(StageItemLink).filter_by(stage_id=stage.id).all()
            stage_inv_items = []
            stage_cost = 0.0
            for link in stage_links:
                inv = db.query(InventoryItem).filter_by(id=link.inventory_item_id).first()
                if inv:
                    stage_cost += inv.total_amount or 0.0
                    stage_inv_items.append({
                        "id": inv.id,
                        "item_name": inv.item_name,
                        "quantity": inv.quantity,
                        "unit_price": inv.unit_price,
                        "total_amount": inv.total_amount,
                        "hsn_code": inv.hsn_code,
                        "invoice_number": inv.invoice_number,
                        "quantity_allocated": link.quantity_allocated,
                    })

            stage_details.append({
                "id": stage.id,
                "name": stage.name,
                "created_at": stage.created_at.isoformat() if stage.created_at else None,
                "processes": [{
                    "id": p.id,
                    "name": p.name,
                    "allowed_image_types": (lambda raw: __import__('json').loads(raw) if raw else [])(p.allowed_image_types),
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                } for p in processes],
                "inventory_items": stage_inv_items,
                "stage_cost": round(stage_cost, 2),
            })

        workflow_details.append({
            "id": workflow.id,
            "name": workflow.name,
            "batch_id": workflow.batch_id,
            "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
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

    # Fetch all inventory items linked to this project's invoices
    inventory_items = (
        db.query(InventoryItem)
        .filter(InventoryItem.invoice_id.in_(invoice_ids))
        .order_by(InventoryItem.created_at.desc())
        .all()
    ) if invoice_ids else []

    inventory_summaries = [
        {
            "id": item.id,
            "item_name": item.item_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_amount": item.total_amount,
            "hsn_code": item.hsn_code,
            "invoice_number": item.invoice_number,
            "source_file_name": item.source_file_name,
            "notes": item.notes,
        }
        for item in inventory_items
    ]

    # Fetch all quality notes for this project, with their attachments
    # Notes store project_id as project_code (e.g. "PRSJ-001") OR as the PWSItem pk,
    # so we match on both, plus project_name as a fallback.
    from sqlalchemy import or_
    quality_notes = (
        db.query(QualityNote)
        .filter(or_(
            QualityNote.project_id == project_id,
            QualityNote.project_id == project.project_code,
            QualityNote.project_name == project.name,
        ))
        .order_by(QualityNote.created_at.desc())
        .all()
    )

    quality_note_summaries = []
    for note in quality_notes:
        attachments = [
            {
                "id": a.id,
                "evidence_type": a.evidence_type,
                "file_path": a.file_path,
                "file_name": a.file_name or (a.file_path.split("/")[-1] if a.file_path else None),
                "file_type": a.file_type,
            }
            for a in (note.attachments or [])
        ]
        quality_note_summaries.append({
            "id": note.id,
            "batch_id": note.batch_id,
            "workflow_stage": note.workflow_stage,
            "process": note.process,
            "note_type": note.note_type,
            "status": note.status,
            "severity": note.severity,
            "observation": note.observation,
            "created_at": note.created_at.isoformat() if note.created_at else None,
            "attachments": attachments,
        })

    return {
        "project": project.to_dict(),
        "workflows": workflow_details,
        "invoices": invoice_summaries,
        "inventory_items": inventory_summaries,
        "quality_notes": quality_note_summaries,
    }


@router.get("/projects/{project_id}/inventory")
def get_project_inventory(project_id: str, db: Session = Depends(get_db)):
    project = db.query(PWSItem).filter_by(id=project_id, type="project").first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    invoice_ids = [
        a.invoice_id for a in
        db.query(InvoiceProjectAssignment).filter_by(project_id=project_id).all()
    ]
    if not invoice_ids:
        return []

    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.invoice_id.in_(invoice_ids))
        .order_by(InventoryItem.created_at.desc())
        .all()
    )
    return [item.to_dict() for item in items]


def _stage_item_link_dict(link: StageItemLink, item: Optional[InventoryItem]) -> Dict[str, Any]:
    data = link.to_dict()
    if item:
        data.update({
            "item_name": item.item_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_amount": item.total_amount,
            "hsn_code": item.hsn_code,
            "invoice_number": item.invoice_number,
        })
    return data


@router.get("/stage-items/{stage_id}")
def get_stage_item_links(stage_id: str, db: Session = Depends(get_db)):
    links = db.query(StageItemLink).filter_by(stage_id=stage_id).all()
    item_ids = [l.inventory_item_id for l in links]
    items_by_id = {}
    if item_ids:
        for item in db.query(InventoryItem).filter(InventoryItem.id.in_(item_ids)).all():
            items_by_id[item.id] = item
    return [_stage_item_link_dict(link, items_by_id.get(link.inventory_item_id)) for link in links]


@router.post("/stage-items", response_model=Dict[str, Any])
def create_stage_item_link(link_in: StageItemLinkCreate, db: Session = Depends(get_db)):
    stage = db.query(PWSItem).filter_by(id=link_in.stage_id, type="stage").first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    item = db.query(InventoryItem).filter_by(id=link_in.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    existing = db.query(StageItemLink).filter_by(
        stage_id=link_in.stage_id, inventory_item_id=link_in.inventory_item_id
    ).first()
    if existing:
        return _stage_item_link_dict(existing, item)

    link = StageItemLink(
        stage_id=link_in.stage_id,
        inventory_item_id=link_in.inventory_item_id,
        quantity_allocated=link_in.quantity_allocated,
        notes=link_in.notes,
    )
    db.add(link)
    try:
        db.commit()
        db.refresh(link)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    log_activity(
        db,
        action="inventory_item_linked",
        category="inventory",
        severity="success",
        entity_type="stage",
        entity_id=stage.id,
        entity_name=stage.name,
        description=f"Inventory item '{item.item_name}' was linked to stage '{stage.name}'.",
    )

    return _stage_item_link_dict(link, item)


@router.delete("/stage-items/{link_id}")
def delete_stage_item_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(StageItemLink).filter_by(id=link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    return {"status": "success"}


class StageCompleteRequest(BaseModel):
    completed_by: Optional[str] = None


@router.post("/stages/{stage_id}/complete", response_model=Dict[str, Any])
def complete_stage(stage_id: str, body: StageCompleteRequest, db: Session = Depends(get_db)):
    stage = db.query(PWSItem).filter_by(id=stage_id, type="stage").first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    stage.completed = True
    stage.completed_at = datetime.now()
    stage.completed_by = body.completed_by
    db.commit()
    db.refresh(stage)

    # Figure out which workflow this stage belongs to, and whether a "next"
    # stage exists, purely for a friendlier notification message.
    workflow_assignment = (
        db.query(PWSAssignment)
        .join(PWSItem, PWSItem.id == PWSAssignment.parent_id)
        .filter(PWSAssignment.child_id == stage_id, PWSItem.type == "workflow")
        .first()
    )
    workflow = db.query(PWSItem).filter_by(id=workflow_assignment.parent_id).first() if workflow_assignment else None
    desc = f"Stage '{stage.name}' was marked complete"
    if workflow:
        desc += f" in workflow '{workflow.name}'"
    desc += "."

    log_activity(
        db,
        action="stage_completed",
        category="workflow",
        severity="success",
        entity_type="stage",
        entity_id=stage.id,
        entity_name=stage.name,
        description=desc,
        username=body.completed_by,
    )

    return stage.to_dict()


@router.post("/stages/{stage_id}/reopen", response_model=Dict[str, Any])
def reopen_stage(stage_id: str, db: Session = Depends(get_db)):
    stage = db.query(PWSItem).filter_by(id=stage_id, type="stage").first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    stage.completed = False
    stage.completed_at = None
    stage.completed_by = None
    db.commit()
    db.refresh(stage)
    return stage.to_dict()


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