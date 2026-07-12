from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from db.database import get_db
from db.models import ActivityLog, NotificationRecipient, NotificationLog
from core.activity_log import EVENT_TYPES

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

ALERT_SEVERITIES = ("warning", "error")


# ─── Logs ───────────────────────────────────────────────────────────────────────

@router.get("/logs")
def get_logs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog)

    if category:
        query = query.filter(ActivityLog.category == category)
    if severity:
        query = query.filter(ActivityLog.severity == severity)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            ActivityLog.action.ilike(like),
            ActivityLog.entity_name.ilike(like),
            ActivityLog.description.ilike(like),
            ActivityLog.username.ilike(like),
        ))

    total = query.count()
    items = (
        query.order_by(ActivityLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": [i.to_dict() for i in items], "total": total}


@router.get("/logs/categories")
def get_log_categories(db: Session = Depends(get_db)):
    rows = db.query(ActivityLog.category).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


# ─── Alerts ─────────────────────────────────────────────────────────────────────
# "Alerts" is simply the important subset of the same log: anything logged
# with severity warning/error, plus successes worth flagging (e.g. a
# completed stage). Kept as its own endpoint so the UI can page/filter it
# independently of the full log stream.

@router.get("/alerts")
def get_alerts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog).filter(ActivityLog.severity.in_(ALERT_SEVERITIES))
    total = query.count()
    items = (
        query.order_by(ActivityLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": [i.to_dict() for i in items], "total": total}


# ─── Notifications: event type registry ────────────────────────────────────────

@router.get("/notifications/event-types")
def get_event_types():
    return [{"key": k, "label": v} for k, v in EVENT_TYPES.items()]


# ─── Notifications: recipients ──────────────────────────────────────────────────

class NotificationRecipientCreate(BaseModel):
    email: str
    label: Optional[str] = None
    active: bool = True
    subscribed_events: List[str] = []


class NotificationRecipientUpdate(BaseModel):
    email: Optional[str] = None
    label: Optional[str] = None
    active: Optional[bool] = None
    subscribed_events: Optional[List[str]] = None


@router.get("/notifications/recipients")
def list_recipients(db: Session = Depends(get_db)):
    recipients = db.query(NotificationRecipient).order_by(NotificationRecipient.created_at.desc()).all()
    return [r.to_dict() for r in recipients]


@router.post("/notifications/recipients", response_model=Dict[str, Any])
def create_recipient(recipient_in: NotificationRecipientCreate, db: Session = Depends(get_db)):
    import json
    valid_events = [e for e in recipient_in.subscribed_events if e in EVENT_TYPES]
    recipient = NotificationRecipient(
        email=recipient_in.email,
        label=recipient_in.label,
        active=recipient_in.active,
        subscribed_events=json.dumps(valid_events),
    )
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    return recipient.to_dict()


@router.put("/notifications/recipients/{recipient_id}", response_model=Dict[str, Any])
def update_recipient(recipient_id: int, update: NotificationRecipientUpdate, db: Session = Depends(get_db)):
    import json
    recipient = db.query(NotificationRecipient).filter_by(id=recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if update.email is not None:
        recipient.email = update.email
    if update.label is not None:
        recipient.label = update.label
    if update.active is not None:
        recipient.active = update.active
    if update.subscribed_events is not None:
        recipient.subscribed_events = json.dumps([e for e in update.subscribed_events if e in EVENT_TYPES])

    db.commit()
    db.refresh(recipient)
    return recipient.to_dict()


@router.delete("/notifications/recipients/{recipient_id}")
def delete_recipient(recipient_id: int, db: Session = Depends(get_db)):
    recipient = db.query(NotificationRecipient).filter_by(id=recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    db.delete(recipient)
    db.commit()
    return {"status": "success"}


# ─── Notifications: sent history ───────────────────────────────────────────────

@router.get("/notifications/history")
def get_notification_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(NotificationLog)
    total = query.count()
    items = (
        query.order_by(NotificationLog.sent_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": [i.to_dict() for i in items], "total": total}