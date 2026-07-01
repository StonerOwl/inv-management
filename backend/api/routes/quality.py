from pathlib import Path
from typing import List, Literal, Optional
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import config
from db.database import get_db
from db.models import User
from db.quality_models import QualityAttachment, QualityNote
from api.dependencies import get_current_active_user

router = APIRouter(prefix="/quality", tags=["quality"])
QUALITY_UPLOAD_DIR = config.UPLOAD_DIR / "quality"


# ── Pydantic Schemas ────────────────────────────────────────────────────────

class QualityNoteCreate(BaseModel):
    """Maps 1:1 to the QualityNoteForm fields on the frontend."""
    project_name: str = Field(..., examples=["Coconut Oil"])
    batch_id: str = Field(..., examples=["PRSJ-2026-001-0001"])
    workflow_stage: Optional[str] = None
    process: Optional[str] = None
    note_type: str = Field(..., examples=["Inspection"])
    status: str = Field(default="Open", examples=["In Progress"])
    severity: Literal["Low", "Medium", "High"] = "Low"
    observation: str = Field(..., min_length=1)
    requires_approval: bool = False


class QualityNoteOut(BaseModel):
    id: int
    project_name: str
    batch_id: str
    workflow_stage: Optional[str] = None
    process: Optional[str] = None
    note_type: str
    status: str
    severity: str
    observation: str
    requires_approval: bool
    approved: bool
    submitter: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class EvidenceSummaryOut(BaseModel):
    total_evidence_files: int
    qa_reports: int
    manual_verifications: int
    note_files: int


class AttachmentOut(BaseModel):
    id: int
    note_id: int
    file_name: str
    evidence_type: str
    file_type: Optional[str] = None

    class Config:
        from_attributes = True


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/notes", response_model=QualityNoteOut)
def create_quality_note(
    payload: QualityNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Handles the 'Save Quality Note' submit button."""
    note = QualityNote(
        user_id=current_user.id,
        project_name=payload.project_name,
        batch_id=payload.batch_id,
        workflow_stage=payload.workflow_stage,
        process=payload.process,
        note_type=payload.note_type,
        status=payload.status,
        severity=payload.severity,
        observation=payload.observation,
        requires_approval=payload.requires_approval,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note.to_dict()


def _save_evidence_files(db: Session, note_id: int, evidence_type: str, files: List[UploadFile]) -> List[QualityAttachment]:
    """Saves uploaded files to disk under uploads/quality/<note_id>/ and records them."""
    saved: List[QualityAttachment] = []
    if not files:
        return saved

    note_dir = QUALITY_UPLOAD_DIR / str(note_id)
    note_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        if not file.filename:
            continue
        suffix = Path(file.filename).suffix
        safe_name = f"{uuid.uuid4().hex}{suffix}"
        dest = note_dir / safe_name
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)

        attachment = QualityAttachment(
            note_id=note_id,
            file_name=file.filename,
            file_path=str(dest),
            evidence_type=evidence_type,
            file_type=file.content_type,
        )
        db.add(attachment)
        saved.append(attachment)

    return saved


@router.post("/notes/{note_id}/evidence", response_model=List[AttachmentOut])
async def upload_quality_evidence(
    note_id: int,
    visual_image: List[UploadFile] = File(default=[]),
    nir_image: List[UploadFile] = File(default=[]),
    thermal_image: List[UploadFile] = File(default=[]),
    qa_report: List[UploadFile] = File(default=[]),
    manual_verification: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Attaches evidence files to an existing note, one field per category --
    matches EvidenceDropzone.jsx's category keys exactly, so the frontend can
    just FormData.append(categoryKey, file) for each queued file.
    """
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")

    all_saved: List[QualityAttachment] = []
    for evidence_type, files in [
        ("visual_image", visual_image),
        ("nir_image", nir_image),
        ("thermal_image", thermal_image),
        ("qa_report", qa_report),
        ("manual_verification", manual_verification),
    ]:
        all_saved.extend(_save_evidence_files(db, note_id, evidence_type, files))

    if not all_saved:
        raise HTTPException(status_code=400, detail="No files provided")

    db.commit()
    for a in all_saved:
        db.refresh(a)
    return [a.to_dict() for a in all_saved]


@router.get("/notes", response_model=List[QualityNoteOut])
def list_quality_notes(
    status: Optional[str] = None,
    batch_id: Optional[str] = None,
    pending_approval: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Powers both the Recent Notes table and, with ?pending_approval=true, the Approvals Queue."""
    query = db.query(QualityNote)
    if status:
        query = query.filter(QualityNote.status == status)
    if batch_id:
        query = query.filter(QualityNote.batch_id == batch_id)
    if pending_approval:
        query = query.filter(QualityNote.requires_approval.is_(True), QualityNote.approved.is_(False))
    notes = query.order_by(QualityNote.created_at.desc()).all()
    return [n.to_dict() for n in notes]


@router.put("/notes/{note_id}/approve", response_model=QualityNoteOut)
def approve_quality_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Manager sign-off action for a row in the Approvals Queue."""
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")
    note.approved = True
    note.status = "Resolved"
    db.commit()
    db.refresh(note)
    return note.to_dict()


@router.get("/summary", response_model=EvidenceSummaryOut)
def get_evidence_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Dummy-friendly counts for the Evidence Summary metric cards."""
    def count(evidence_type: str) -> int:
        return db.query(QualityAttachment).filter(QualityAttachment.evidence_type == evidence_type).count()

    return {
        "total_evidence_files": db.query(QualityAttachment).count(),
        "qa_reports": count("qa_report"),
        "manual_verifications": count("manual_verification"),
        "note_files": count("visual_image") + count("nir_image") + count("thermal_image"),
    }
