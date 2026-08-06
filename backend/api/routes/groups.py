from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.dependencies import get_db, get_current_active_user
from db.models import InvoiceGroup, InvoiceProjectAssignment, User
from core.activity_log import log_activity

router = APIRouter(prefix="/groups", tags=["Invoice Groups"])

class GroupCreate(BaseModel):
    name: str
    color: Optional[str] = "gray"
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

@router.get("", response_model=List[Dict[str, Any]])
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(InvoiceGroup).order_by(InvoiceGroup.name).all()
    return [group.to_dict() for group in groups]

@router.post("", response_model=Dict[str, Any])
def create_group(
    data: GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    existing = db.query(InvoiceGroup).filter(InvoiceGroup.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group with this name already exists")
    
    group = InvoiceGroup(
        name=data.name,
        color=data.color or "gray",
        description=data.description
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    
    log_activity(
        db, action="group_created", category="group", severity="info",
        entity_type="group", entity_id=str(group.id), entity_name=group.name,
        description=f"Group created: {group.name}",
        username=current_user.username
    )
    
    return group.to_dict()

@router.put("/{group_id}", response_model=Dict[str, Any])
def update_group(
    group_id: int, 
    data: GroupUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    group = db.query(InvoiceGroup).filter(InvoiceGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if data.name is not None:
        existing = db.query(InvoiceGroup).filter(InvoiceGroup.name == data.name, InvoiceGroup.id != group_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Group with this name already exists")
        group.name = data.name
        
    if data.color is not None:
        group.color = data.color
        
    if data.description is not None:
        group.description = data.description
        
    db.commit()
    db.refresh(group)
    
    log_activity(
        db, action="group_updated", category="group", severity="info",
        entity_type="group", entity_id=str(group.id), entity_name=group.name,
        description=f"Group updated: {group.name}",
        username=current_user.username
    )
    
    return group.to_dict()

@router.delete("/{group_id}")
def delete_group(
    group_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    group = db.query(InvoiceGroup).filter(InvoiceGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # The ON DELETE SET NULL handles setting group_id to NULL on existing assignments
    db.delete(group)
    db.commit()
    
    log_activity(
        db, action="group_deleted", category="group", severity="warning",
        entity_type="group", entity_id=str(group_id), entity_name=group.name,
        description=f"Group deleted: {group.name}",
        username=current_user.username
    )
    
    return {"message": "Group deleted successfully"}
