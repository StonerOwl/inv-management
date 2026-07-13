import base64
import hashlib
import hmac
import io
import json
from pathlib import Path
from typing import List, Literal, Optional
import shutil
import uuid

import qrcode
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import config
from db.database import get_db
from db.models import User
from db.quality_models import QualityAttachment, QualityNote
from api.dependencies import get_current_active_user, get_current_admin

router = APIRouter(prefix="/quality", tags=["quality"])
QUALITY_UPLOAD_DIR = config.UPLOAD_DIR / "quality"


class QualityNoteCreate(BaseModel):
    project_name: str = Field(..., examples=["Coconut Oil"])
    project_id: Optional[str] = None
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
    project_id: Optional[str] = None
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


class QRCodeOut(BaseModel):
    note_id: int
    note_display_id: str
    payload: str
    image_base64: str


class QRVerifyIn(BaseModel):
    payload: str = Field(..., min_length=1)


class QRVerifyOut(BaseModel):
    valid: bool
    note: Optional[QualityNoteOut] = None
    reason: Optional[str] = None


def _note_display_id(note_id: int) -> str:
    return f"QN-{note_id:04d}"


def _sign_note(note_id: int, batch_id: str) -> str:
    message = f"{note_id}:{batch_id}".encode("utf-8")
    return hmac.new(config.SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()[:16]


def _build_qr_payload(note: QualityNote) -> str:
    payload = {
        "type": "quality_note",
        "note_id": note.id,
        "note_display_id": _note_display_id(note.id),
        "batch_id": note.batch_id,
        "project_name": note.project_name,
        "sig": _sign_note(note.id, note.batch_id),
    }
    return json.dumps(payload)


@router.post("/notes", response_model=QualityNoteOut)
def create_quality_note(
    payload: QualityNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = QualityNote(
        user_id=current_user.id,
        project_name=payload.project_name,
        project_id=payload.project_id,
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
    xray_image: List[UploadFile] = File(default=[]),
    spectral_image: List[UploadFile] = File(default=[]),
    ultrasonic_image: List[UploadFile] = File(default=[]),
    qa_report: List[UploadFile] = File(default=[]),
    manual_verification: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")

    all_saved: List[QualityAttachment] = []
    for evidence_type, files in [
        ("visual_image", visual_image),
        ("nir_image", nir_image),
        ("thermal_image", thermal_image),
        ("xray_image", xray_image),
        ("spectral_image", spectral_image),
        ("ultrasonic_image", ultrasonic_image),
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
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")
    note.approved = True
    note.status = "Resolved"
    db.commit()
    db.refresh(note)
    return note.to_dict()


@router.delete("/notes/{note_id}")
def delete_quality_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")

    note_dir = QUALITY_UPLOAD_DIR / str(note_id)
    if note_dir.exists():
        shutil.rmtree(note_dir, ignore_errors=True)

    db.delete(note)
    db.commit()
    return {"status": "success", "deleted_id": note_id}


@router.delete("/notes")
def clear_all_quality_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Wipes every quality note (and its attachments/files) from the database.
    Admin-only, since this is irreversible. Intended for clearing out test
    data before going to production.
    """
    count = db.query(QualityNote).count()

    if QUALITY_UPLOAD_DIR.exists():
        shutil.rmtree(QUALITY_UPLOAD_DIR, ignore_errors=True)
        QUALITY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    db.query(QualityAttachment).delete()
    db.query(QualityNote).delete()
    db.commit()
    return {"status": "success", "deleted_count": count}


@router.get("/summary", response_model=EvidenceSummaryOut)
def get_evidence_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    def count(evidence_type: str) -> int:
        return db.query(QualityAttachment).filter(QualityAttachment.evidence_type == evidence_type).count()

    return {
        "total_evidence_files": db.query(QualityAttachment).count(),
        "qa_reports": count("qa_report"),
        "manual_verifications": count("manual_verification"),
        "note_files": count("visual_image") + count("nir_image") + count("thermal_image") + count("xray_image") + count("spectral_image") + count("ultrasonic_image"),
    }


@router.get("/notes/{note_id}/qrcode", response_model=QRCodeOut)
def get_quality_note_qrcode(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Quality note not found")

    payload = _build_qr_payload(note)
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    image_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return {
        "note_id": note.id,
        "note_display_id": _note_display_id(note.id),
        "payload": payload,
        "image_base64": f"data:image/png;base64,{image_base64}",
    }


@router.post("/notes/verify", response_model=QRVerifyOut)
def verify_quality_note_qrcode(
    body: QRVerifyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        parsed = json.loads(body.payload)
    except (TypeError, ValueError):
        return {"valid": False, "note": None, "reason": "This code is not a recognized quality note QR."}

    if not isinstance(parsed, dict) or parsed.get("type") != "quality_note":
        return {"valid": False, "note": None, "reason": "This code is not a quality note QR."}

    note_id = parsed.get("note_id")
    note = db.query(QualityNote).filter(QualityNote.id == note_id).first() if note_id else None
    if not note:
        return {"valid": False, "note": None, "reason": "No matching quality note was found."}

    expected_sig = _sign_note(note.id, note.batch_id)
    if not hmac.compare_digest(expected_sig, str(parsed.get("sig", ""))):
        return {"valid": False, "note": None, "reason": "Signature mismatch — this code may be tampered or stale."}

    return {"valid": True, "note": note.to_dict(), "reason": None}


@router.get("/attachments/{attachment_id}/file")
def serve_attachment_file(
    attachment_id: int,
    db: Session = Depends(get_db),
):
    """Serve the raw file for a quality attachment by ID."""
    attachment = db.query(QualityAttachment).filter(QualityAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    stored = Path(attachment.file_path)

    # Build candidate paths to find the file regardless of how the path was stored:
    # 1. Exactly as stored (works when path is already correct absolute path)
    # 2. Relative to UPLOAD_DIR (handles relative paths)
    # 3. Re-rooted under UPLOAD_DIR using just the trailing parts after "uploads/"
    #    (handles cases where the absolute path was built with a different base)
    candidates = [stored]
    if not stored.is_absolute():
        candidates.append(config.UPLOAD_DIR / stored)
    else:
        # Try re-rooting: find "uploads/" or "quality/" segment and rebuild
        parts = stored.parts
        for i, part in enumerate(parts):
            if part == "quality":
                candidates.append(config.UPLOAD_DIR / Path(*parts[i:]))
                break
        candidates.append(config.UPLOAD_DIR / stored.name)

    fp = next((p for p in candidates if p.exists()), None)
    if fp is None:
        raise HTTPException(status_code=404, detail=f"File not found on disk (tried: {[str(c) for c in candidates]})")

    media_type = attachment.file_type or "application/octet-stream"
    return FileResponse(
        path=str(fp),
        media_type=media_type,
        filename=attachment.file_name or fp.name,
    )