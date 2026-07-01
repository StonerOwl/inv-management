"""
Async batch processing engine.
Manages a job queue for processing multiple invoice files concurrently.
"""
import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Any

import config
from core.document_loader import load_document, compute_file_hash
from core.extractor import extract_invoice_fields
from db.database import SessionLocal
from db.repository import InvoiceRepository

logger = logging.getLogger(__name__)

# In-memory job store (suitable for single-process; use Redis for multi-process)
_jobs: dict[str, dict[str, Any]] = {}
# Serialize LLM inference: on CPU-only hardware, concurrent Ollama calls compete
# for CPU/RAM and make each request slower due to memory contention.
_semaphore: asyncio.Semaphore = asyncio.Semaphore(1)


def create_job(file_paths: list[str]) -> str:
    """Register a new batch job and return its ID."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "id": job_id,
        "total_files": len(file_paths),
        "processed": 0,
        "failed": 0,
        "pending": len(file_paths),
        "status": "queued",
        "results": [],
        "logs": [],
    }
    return job_id

def _add_log(job_id: str, msg: str) -> None:
    job = _jobs.get(job_id)
    if job:
        job.setdefault("logs", []).append(f"[{time.strftime('%H:%M:%S')}] {msg}")


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def list_jobs() -> list[dict]:
    return list(_jobs.values())


async def process_batch(job_id: str, file_paths: list[str]) -> None:
    """
    Process all files in a batch job concurrently (up to MAX_CONCURRENT_JOBS).
    Updates job state in-place for polling.
    """
    job = _jobs[job_id]
    job["status"] = "processing"

    # ── Check model availability ONCE per batch (not per file) ────────────
    from core.ollama_client import ollama
    try:
        model_ok = await ollama.is_model_available(config.OLLAMA_TEXT_MODEL)
    except Exception:
        job["status"] = "failed"
        job["results"].append({
            "file_name": "*",
            "status": "error",
            "error": f"Cannot connect to Ollama at {config.OLLAMA_HOST}. Make sure Ollama is running: `ollama serve`",
        })
        return
    if not model_ok:
        job["status"] = "failed"
        job["results"].append({
            "file_name": "*",
            "status": "error",
            "error": f"Ollama model '{config.OLLAMA_TEXT_MODEL}' is not available. Please pull it first: `ollama pull {config.OLLAMA_TEXT_MODEL}`",
        })
        return

    # Process files sequentially — on CPU-only hardware, concurrent Ollama
    # calls don't parallelize; they compete for CPU/RAM and cause model swapping.
    for fp in file_paths:
        try:
            await _process_single_file(job_id, fp)
        except Exception:
            pass  # Errors already tracked inside _process_single_file

    failed = job["failed"]
    processed = job["processed"]
    job["status"] = "done" if failed == 0 else (
        "partial_failure" if processed > 0 else "failed"
    )
    logger.info(
        f"Job {job_id} complete: {processed} ok, {failed} failed out of {len(file_paths)}"
    )


async def _process_single_file(job_id: str, file_path_str: str) -> None:
    """Process one invoice file under the semaphore (rate limiting)."""
    async with _semaphore:
        start_ms = int(time.time() * 1000)
        file_path = Path(file_path_str)
        job = _jobs[job_id]

        result_entry: dict[str, Any] = {
            "file_name": file_path.name,
            "status": "pending",
            "invoice_id": None,
            "error": None,
        }

        db = None
        try:
            db = SessionLocal()
            repo = InvoiceRepository(db)

            # ── Step 1: Check deduplication ──────────────────────────────────
            file_hash = compute_file_hash(file_path)
            existing = repo.exists_by_hash(file_hash)
            if existing:
                logger.info(f"Duplicate skipped: {file_path.name} (id={existing.id})")
                result_entry.update({
                    "status": "duplicate",
                    "invoice_id": existing.id,
                    "message": "Already processed",
                })
                job["processed"] += 1
                job["pending"] -= 1
                job["results"].append(result_entry)
                db.close()
                return

            # ── Step 2: Load document (OCR if needed) ────────────────────────
            # Model availability is checked once in process_batch(), not here
            logger.info(f"Loading: {file_path.name}")
            _add_log(job_id, f"Loading and extracting text for {file_path.name}...")
            doc_result = await asyncio.to_thread(load_document, file_path)

            if doc_result.error:
                _add_log(job_id, f"Document load failed for {file_path.name}: {doc_result.error}")
                raise RuntimeError(f"Document load failed: {doc_result.error}")

            # ── Step 4: LLM extraction ───────────────────────────────────────
            try:
                _add_log(job_id, f"Ollama natively extracting data for {file_path.name} (Text Mode)...")
                extracted = await extract_invoice_fields(doc_result.raw_text)
            except RuntimeError as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    raise RuntimeError(
                        f"Model '{config.OLLAMA_TEXT_MODEL}' returned 404 — "
                        f"it may still be downloading. Run: `ollama pull {config.OLLAMA_TEXT_MODEL}`"
                    )
                raise

            # ── Step 5: Save to DB ───────────────────────────────────────────
            invoice = repo.save_invoice(doc_result, extracted, job_id)

            # ── Step 6: Save JSON to disk ────────────────────────────────────
            json_path = file_path.with_suffix(".json")
            try:
                with open(json_path, "w", encoding="utf-8") as jf:
                    jf.write(extracted.model_dump_json(indent=2))
            except Exception as e:
                logger.warning(f"Failed to save JSON for {file_path.name}: {e}")

            duration = int(time.time() * 1000) - start_ms
            logger.info(
                f"✓ {file_path.name}: id={invoice.id}, "
                f"confidence={extracted.confidence_score:.2f}, {duration}ms"
            )
            _add_log(job_id, f"Completed processing {file_path.name} successfully (Confidence: {extracted.confidence_score:.2f}).")
            result_entry.update({
                "status": "ok",
                "invoice_id": invoice.id,
                "confidence": extracted.confidence_score,
                "duration_ms": duration,
            })
            job["processed"] += 1

        except Exception as e:
            logger.error(f"✗ {file_path.name}: {e}")
            _add_log(job_id, f"Error processing {file_path.name}: {e}")
            result_entry.update({"status": "error", "error": str(e)})
            job["failed"] += 1
            try:
                repo.save_error(None, file_path.name, "", str(e), job_id)
            except Exception:
                pass
        finally:
            job["pending"] = max(0, job["pending"] - 1)
            job["results"].append(result_entry)
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
