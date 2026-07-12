from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from db.database import get_db
from db.models import Device
from core.activity_log import log_activity

class DeviceCreate(BaseModel):
    name: str
    category: str
    subtype: Optional[str] = None
    interface: Optional[str] = None
    linked_process: Optional[str] = None

router = APIRouter(
    prefix="/devices",
    tags=["devices"],
)

@router.get("/")
def get_devices(db: Session = Depends(get_db)):
    """Fetch all connected devices for the data table."""
    devices = db.query(Device).order_by(Device.id.desc()).all()
    return [d.to_dict() for d in devices]

@router.post("/")
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    """Register a new device."""
    new_device = Device(
        name=device_in.name,
        category=device_in.category,
        subtype=device_in.subtype,
        interface=device_in.interface,
        linked_process=device_in.linked_process,
        status="Online",
        quality_notes_count=0,
        last_sync_mins_ago=0,
        calibration_due_days=30,
        signal_quality=100.0,
        device_health=100.0,
        temperature=25.0,
        humidity=50.0,
        power_battery=100.0,
        uptime_percentage=100.0,
        data_throughput_mbps=0.0
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    log_activity(
        db,
        action="device_created",
        category="device",
        severity="success",
        entity_type="device",
        entity_id=new_device.id,
        entity_name=new_device.name,
        description=f"Device '{new_device.name}' ({new_device.category}) was added.",
    )
    return new_device.to_dict()

@router.put("/{device_id}")
def update_device(device_id: int, device_in: DeviceCreate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.name = device_in.name
    device.category = device_in.category
    device.subtype = device_in.subtype
    device.interface = device_in.interface
    device.linked_process = device_in.linked_process
    
    db.commit()
    db.refresh(device)
    log_activity(
        db,
        action="device_updated",
        category="device",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        description=f"Device '{device.name}' was updated.",
    )
    return device.to_dict()

@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device_name = device.name
    db.delete(device)
    db.commit()
    log_activity(
        db,
        action="device_deleted",
        category="device",
        severity="warning",
        entity_type="device",
        entity_id=device_id,
        entity_name=device_name,
        description=f"Device '{device_name}' was removed.",
    )
    return {"message": "Device deleted"}

@router.post("/{device_id}/notes")
def add_device_note(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device.quality_notes_count += 1
    db.commit()
    log_activity(
        db,
        action="device_note_added",
        category="device",
        entity_type="device",
        entity_id=device.id,
        entity_name=device.name,
        description=f"A note was added to '{device.name}' ({device.quality_notes_count} total).",
    )
    return {"message": "Note added", "quality_notes_count": device.quality_notes_count}

def _label_for(metric: str, value: float) -> str:
    """Derive a human-readable label from a metric value."""
    if metric in ("signal_quality", "device_health", "power_battery", "uptime"):
        if value >= 95:
            return "Excellent"
        elif value >= 80:
            return "Good"
        elif value >= 60:
            return "Fair"
        else:
            return "Poor"
    if metric == "temperature":
        if value <= 35:
            return "Normal"
        elif value <= 50:
            return "Warm"
        else:
            return "Hot"
    if metric == "humidity":
        if 30 <= value <= 60:
            return "Normal"
        elif value < 30:
            return "Low"
        else:
            return "High"
    return ""

# Category descriptions (static metadata — not fake numbers)
CATEGORY_DESCRIPTIONS = {
    "Sensor Arrays": "Gas, VOC, Chemical, Food, Manufacturing",
    "Cameras / Camera Arrays": "Visual, NIR, Thermal, Inspection, Sorting",
    "Spectral": "NIR, VIS, Raman, Screening, Grading",
    "Ultrasonic / Acoustics": "Ultrasound, Acoustic, Integrity, Thickness",
    "X-Ray": "Digital X-Ray, Contaminant, Density",
    "Analytical Instruments": "GCMS, LCMS, MS, FTIR, NIR, Raman, Lab, Process Analysis",
    "Gateways & APIs": "Edge, Cloud, APIs, Connectivity, Integration",
}

@router.get("/stats")
def get_device_stats(db: Session = Depends(get_db)):
    """Compute all dashboard stats from real device data in the database."""
    all_devices = db.query(Device).all()
    total = len(all_devices)

    if total == 0:
        # Return zeros when no devices exist yet
        return {
            "top_cards": {
                "total_devices": 0, "total_devices_trend": "No devices yet",
                "online": 0, "online_percentage": 0,
                "pending_setup": 0, "pending_percentage": 0,
                "calibration_due": 0, "calibration_percentage": 0,
                "data_sync_alerts": 0
            },
            "categories": {k: {"count": 0, "desc": v} for k, v in CATEGORY_DESCRIPTIONS.items()},
            "interfaces": {},
            "monitoring": {
                "signal_quality": {"value": 0, "label": "N/A"},
                "device_health": {"value": 0, "label": "N/A"},
                "temperature": {"value": 0, "label": "N/A"},
                "humidity": {"value": 0, "label": "N/A"},
                "power_battery": {"value": 0, "label": "N/A"},
                "uptime": {"value": 0, "label": "N/A"},
                "calibration_status": {"due": 0, "total": 0},
                "data_throughput": {"value": 0, "unit": "MB/s", "label": "N/A"}
            },
            "alerts": []
        }

    # ---- Top Cards ----
    online_count = sum(1 for d in all_devices if d.status == "Online")
    pending_count = sum(1 for d in all_devices if d.status in ("Pending", "Pending Setup"))
    calibration_due_count = sum(1 for d in all_devices if d.calibration_due_days is not None and d.calibration_due_days <= 30)
    low_signal_count = sum(1 for d in all_devices if d.signal_quality is not None and d.signal_quality < 90)

    # Count devices added in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_count = sum(1 for d in all_devices if d.created_at and d.created_at >= week_ago)
    trend_text = f"+{recent_count} in last 7 days" if recent_count > 0 else "No new devices"

    online_pct = round(online_count / total * 100) if total else 0
    pending_pct = round(pending_count / total * 100) if total else 0
    cal_pct = round(calibration_due_count / total * 100) if total else 0

    # ---- Categories ----
    category_counts = {}
    for d in all_devices:
        cat = d.category or "Uncategorized"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    categories_result = {}
    for cat_name, desc in CATEGORY_DESCRIPTIONS.items():
        categories_result[cat_name] = {
            "count": category_counts.get(cat_name, 0),
            "desc": desc
        }
    # Include any categories from DB that aren't in the predefined list
    for cat_name, count in category_counts.items():
        if cat_name not in categories_result:
            categories_result[cat_name] = {"count": count, "desc": ""}

    # ---- Interfaces ----
    interface_counts = {}
    for d in all_devices:
        iface = d.interface or "Unknown"
        interface_counts[iface] = interface_counts.get(iface, 0) + 1

    interfaces_result = {}
    for iface, count in interface_counts.items():
        interfaces_result[iface] = f"{count} Device{'s' if count != 1 else ''}"

    # ---- Monitoring (averages across all devices) ----
    def safe_avg(values):
        filtered = [v for v in values if v is not None]
        return round(sum(filtered) / len(filtered), 1) if filtered else 0

    avg_signal = safe_avg([d.signal_quality for d in all_devices])
    avg_health = safe_avg([d.device_health for d in all_devices])
    avg_temp = safe_avg([d.temperature for d in all_devices])
    avg_humidity = safe_avg([d.humidity for d in all_devices])
    avg_power = safe_avg([d.power_battery for d in all_devices])
    avg_uptime = safe_avg([d.uptime_percentage for d in all_devices])
    total_throughput = round(sum(d.data_throughput_mbps or 0 for d in all_devices), 1)

    # ---- Alerts (derived from real conditions) ----
    alerts = []
    if calibration_due_count > 0:
        alerts.append({
            "type": "Calibration Due",
            "count": calibration_due_count,
            "time_ago": "Now",
            "severity": "High" if calibration_due_count >= 5 else "Medium"
        })
    
    offline_count = sum(1 for d in all_devices if d.status == "Offline")
    if offline_count > 0:
        alerts.append({
            "type": "Devices Offline",
            "count": offline_count,
            "time_ago": "Now",
            "severity": "High"
        })

    if low_signal_count > 0:
        alerts.append({
            "type": "Low Signal Quality",
            "count": low_signal_count,
            "time_ago": "Now",
            "severity": "Medium"
        })

    low_battery = sum(1 for d in all_devices if d.power_battery is not None and d.power_battery < 20)
    if low_battery > 0:
        alerts.append({
            "type": "Low Battery",
            "count": low_battery,
            "time_ago": "Now",
            "severity": "High"
        })

    return {
        "top_cards": {
            "total_devices": total,
            "total_devices_trend": trend_text,
            "online": online_count,
            "online_percentage": online_pct,
            "pending_setup": pending_count,
            "pending_percentage": pending_pct,
            "calibration_due": calibration_due_count,
            "calibration_percentage": cal_pct,
            "data_sync_alerts": len(alerts)
        },
        "categories": categories_result,
        "interfaces": interfaces_result,
        "monitoring": {
            "signal_quality": {"value": avg_signal, "label": _label_for("signal_quality", avg_signal)},
            "device_health": {"value": avg_health, "label": _label_for("device_health", avg_health)},
            "temperature": {"value": avg_temp, "label": _label_for("temperature", avg_temp)},
            "humidity": {"value": avg_humidity, "label": _label_for("humidity", avg_humidity)},
            "power_battery": {"value": avg_power, "label": _label_for("power_battery", avg_power)},
            "uptime": {"value": avg_uptime, "label": _label_for("uptime", avg_uptime)},
            "calibration_status": {"due": calibration_due_count, "total": total},
            "data_throughput": {"value": total_throughput, "unit": "MB/s", "label": "Live"}
        },
        "alerts": alerts
    }