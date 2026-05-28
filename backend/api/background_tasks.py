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
from core.vision_extractor import extract_from_image
from db.database import SessionLocal
from db.repository import InvoiceRepository

logger = logging.getLogger(__name__)

# In-memory job store (suitable for single-process; use Redis for multi-process)
_jobs: dict[str, dict[str, Any]] = {}
_semaphore: asyncio.Semaphore = asyncio.Semaphore(config.MAX_CONCURRENT_JOBS)


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
    }
    return job_id


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

    tasks = [_process_single_file(job_id, fp) for fp in file_paths]
    await asyncio.gather(*tasks, return_exceptions=True)

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

            # ── Step 2: Check Ollama model availability ─────────────────────
            from core.ollama_client import ollama

            try:
                model_ok = await ollama.is_model_available(config.OLLAMA_TEXT_MODEL)
            except Exception:
                raise RuntimeError(
                    f"Cannot connect to Ollama at {config.OLLAMA_HOST}. "
                    f"Make sure Ollama is running: `ollama serve`"
                )
            if not model_ok:
                raise RuntimeError(
                    f"Ollama model '{config.OLLAMA_TEXT_MODEL}' is not available. "
                    f"Please pull it first: `ollama pull {config.OLLAMA_TEXT_MODEL}` "
                    f"(this may take several minutes for the initial download)"
                )

            # ── Step 3: Load document (OCR if needed) ────────────────────────
            logger.info(f"Loading: {file_path.name}")
            doc_result = await asyncio.to_thread(load_document, file_path)

            if doc_result.error:
                raise RuntimeError(f"Document load failed: {doc_result.error}")

            # ── Step 4: LLM extraction ───────────────────────────────────────
            try:
                extracted = await extract_invoice_fields(doc_result.raw_text)
            except RuntimeError as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    raise RuntimeError(
                        f"Model '{config.OLLAMA_TEXT_MODEL}' returned 404 — "
                        f"it may still be downloading. Run: `ollama pull {config.OLLAMA_TEXT_MODEL}`"
                    )
                raise

            # Fallback to vision if confidence too low and file is an image
            low_confidence = extracted.confidence_score < config.EXTRACTION_CONFIDENCE_THRESHOLD
            is_image = file_path.suffix.lower() in config.SUPPORTED_IMAGE_EXTENSIONS

            if low_confidence and is_image:
                logger.info(
                    f"Low confidence ({extracted.confidence_score:.2f}), "
                    f"trying vision LLM for {file_path.name}"
                )
                try:
                    vision_result = await extract_from_image(file_path)
                    if vision_result.confidence_score > extracted.confidence_score:
                        extracted = vision_result
                except Exception as ve:
                    logger.warning(f"Vision fallback failed: {ve} — using text extraction")

            # ── Step 4: Save to DB ───────────────────────────────────────────
            invoice = repo.save_invoice(doc_result, extracted, job_id)

            duration = int(time.time() * 1000) - start_ms
            logger.info(
                f"✓ {file_path.name}: id={invoice.id}, "
                f"confidence={extracted.confidence_score:.2f}, {duration}ms"
            )
            result_entry.update({
                "status": "ok",
                "invoice_id": invoice.id,
                "confidence": extracted.confidence_score,
                "duration_ms": duration,
            })
            job["processed"] += 1

        except Exception as e:
            logger.error(f"✗ {file_path.name}: {e}")
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
