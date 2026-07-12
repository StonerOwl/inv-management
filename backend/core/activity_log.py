"""
Central activity-log + notification helpers.

Any route that creates/updates/deletes something meaningful should call
`log_activity(...)` right after it commits. That single call:
  1. Writes a row to `activity_logs` (powers Monitoring > Logs / Alerts).
  2. Emails every active NotificationRecipient subscribed to that event type
     (powers Monitoring > Notifications), recording the attempt either way.

Both steps are best-effort: a logging/notification failure is caught and
written to the application logger, never raised back to the caller, so it
can never break the actual feature (adding a device, uploading an invoice,
etc.) that triggered it.
"""
import json
import logging
import smtplib
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.orm import Session

import config
from db.models import ActivityLog, NotificationRecipient, NotificationLog

logger = logging.getLogger(__name__)

# ─── Event type registry ───────────────────────────────────────────────────────
# Single source of truth for what shows up in the notification subscription
# UI. Keys are what get_activity()/notify_event() pass as `action`.
EVENT_TYPES: dict[str, str] = {
    "device_created": "Device added",
    "device_updated": "Device updated",
    "device_deleted": "Device removed",
    "device_note_added": "Device note added",
    "project_created": "Project created",
    "workflow_created": "Workflow created",
    "stage_created": "Stage created",
    "process_created": "Process created",
    "invoice_uploaded": "Invoice uploaded",
    "invoice_linked_to_project": "Invoice linked to a project",
    "inventory_item_linked": "Inventory item linked to a stage",
    "stage_completed": "Stage marked complete",
}


def log_activity(
    db: Session,
    *,
    action: str,
    category: str,
    severity: str = "info",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    description: Optional[str] = None,
    username: Optional[str] = None,
    notify: bool = True,
) -> Optional[ActivityLog]:
    """
    Record one activity-log row and (if `notify`) email any subscribed
    recipients. Safe to call from any route — never raises.
    """
    try:
        entry = ActivityLog(
            action=action,
            category=category,
            severity=severity,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            entity_name=entity_name,
            description=description,
            username=username,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
    except Exception:
        logger.exception("Failed to write activity log for action=%s", action)
        db.rollback()
        entry = None

    if notify and action in EVENT_TYPES:
        try:
            _notify_event(db, action=action, entity_name=entity_name, description=description)
        except Exception:
            logger.exception("Failed to send notifications for action=%s", action)

    return entry


def _send_email(to_email: str, subject: str, body: str) -> tuple[str, Optional[str]]:
    """Returns (status, error) where status is 'sent' | 'failed' | 'skipped'."""
    if not config.SMTP_HOST:
        return "skipped", "SMTP is not configured (set SMTP_HOST in the backend .env)"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            if config.SMTP_USERNAME:
                server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        return "sent", None
    except Exception as e:
        logger.warning("Failed to send notification email to %s: %s", to_email, e)
        return "failed", str(e)


def _notify_event(db: Session, *, action: str, entity_name: Optional[str], description: Optional[str]) -> None:
    label = EVENT_TYPES.get(action, action)
    recipients = db.query(NotificationRecipient).filter_by(active=True).all()
    targets = []
    for r in recipients:
        try:
            subscribed = json.loads(r.subscribed_events) if r.subscribed_events else []
        except Exception:
            subscribed = []
        if action in subscribed:
            targets.append(r)

    if not targets:
        return

    subject = f"[AIQ Platform] {label}" + (f" — {entity_name}" if entity_name else "")
    body = description or label
    if entity_name:
        body = f"{label}: {entity_name}\n\n{description or ''}".strip()

    for r in targets:
        status, error = _send_email(r.email, subject, body)
        db.add(NotificationLog(
            event_type=action,
            subject=subject,
            recipient_email=r.email,
            status=status,
            error=error,
        ))
    db.commit()


def notify_event(db: Session, *, action: str, entity_name: Optional[str] = None, description: Optional[str] = None) -> None:
    """Public entry point to trigger notifications without writing a log row (rarely needed directly)."""
    _notify_event(db, action=action, entity_name=entity_name, description=description)