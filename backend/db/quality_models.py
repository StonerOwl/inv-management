"""
SQLAlchemy ORM models for Quality Management.

Shares Base (and therefore the same metadata/engine) with db/models.py, so no
changes to db/database.py are required -- importing this module anywhere
before init_db() runs registers these tables for creation.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship

from db.models import Base


class QualityNote(Base):
    __tablename__ = "quality_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    project_name = Column(String(200), nullable=False, index=True)   # e.g. "Coconut Oil"
    batch_id = Column(String(100), nullable=False, index=True)       # e.g. "PRSJ-2026-001-0001"
    workflow_stage = Column(String(100), nullable=True)
    process = Column(String(100), nullable=True)
    note_type = Column(String(50), nullable=False)                   # Inspection, Deviation, Audit...
    status = Column(String(50), default="Open", index=True)          # Open, In Progress, Resolved...
    severity = Column(String(20), default="Low")                     # Low, Medium, High
    observation = Column(Text, nullable=False)

    requires_approval = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    attachments = relationship("QualityAttachment", back_populates="note", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_name": self.project_name,
            "batch_id": self.batch_id,
            "workflow_stage": self.workflow_stage,
            "process": self.process,
            "note_type": self.note_type,
            "status": self.status,
            "severity": self.severity,
            "observation": self.observation,
            "requires_approval": self.requires_approval,
            "approved": self.approved,
            "submitter": self.user.username if self.user else "Unknown",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "attachments": [a.to_dict() for a in self.attachments] if self.attachments else [],
        }


class QualityAttachment(Base):
    __tablename__ = "quality_attachments"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("quality_notes.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    # matches the category keys used by EvidenceDropzone.jsx on the frontend
    evidence_type = Column(String(50), nullable=False)  # visual_image | nir_image | thermal_image | qa_report | manual_verification
    file_type = Column(String(100), nullable=True)       # mime type

    note = relationship("QualityNote", back_populates="attachments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "note_id": self.note_id,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "evidence_type": self.evidence_type,
            "file_type": self.file_type,
        }
