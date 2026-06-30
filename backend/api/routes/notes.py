from typing import List, Optional
import os
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, Note, NoteAttachment
from api.dependencies import get_current_active_user

router = APIRouter(
    prefix="/notes",
    tags=["notes"],
)

NOTES_UPLOAD_DIR = "uploads/notes"
os.makedirs(NOTES_UPLOAD_DIR, exist_ok=True)

@router.get("")
def get_notes(
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notes, optionally filtered by target."""
    query = db.query(Note)
    if target_type:
        query = query.filter(Note.target_type == target_type)
    if target_id:
        query = query.filter(Note.target_id == target_id)
        
    notes = query.order_by(Note.created_at.asc()).all()
    return [note.to_dict() for note in notes]


@router.post("")
async def create_note(
    target_type: str = Form(...),
    target_id: str = Form(...),
    content: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new note with optional file attachments."""
    
    from core.embeddings import get_embedding
    
    new_note = Note(
        user_id=current_user.id,
        target_type=target_type,
        target_id=target_id,
        content=content,
        embedding=get_embedding(content)
    )
    
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    # Handle file attachments
    if files:
        for file in files:
            if not file.filename:
                continue
                
            file_ext = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = os.path.join(NOTES_UPLOAD_DIR, unique_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            attachment = NoteAttachment(
                note_id=new_note.id,
                file_name=file.filename,
                file_path=file_path,
                file_type=file.content_type
            )
            db.add(attachment)
            
        db.commit()
        db.refresh(new_note)

    return new_note.to_dict()
