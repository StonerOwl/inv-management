# Backend API

This folder contains the FastAPI Python backend for the Invoice AI platform.

## Directory Structure

- `/api` - Contains all the route handlers (FastAPI routers).
  - `routes/` - Individual route files like `invoices.py`, `po.py`, `products.py`.
  - `dependencies.py` - FastAPI dependencies (authentication, authorization).
  - `background_tasks.py` - Asynchronous tasks for invoice processing using Ollama.
- `/core` - Core business logic and extraction services.
  - `extractor.py` - LLM text extraction pipelines.
  - `document_loader.py` - PDF and Image ingestion handling.
  - `ocr_engine.py` - Tesseract OCR integration.
  - `vision_extractor.py` - Vision LLM processing.
- `/data` - Contains the local SQLite database (`invoices.db`).
- `/db` - Database setup and models.
  - `database.py` - SQLAlchemy engine configuration.
  - `models.py` - SQLAlchemy ORM models.
  - `repository.py` - Database query logic.
- `/models` - Pydantic schemas (e.g., `invoice_schema.py`) used for API requests/responses and LLM extraction validation.
- `/scripts` - Utilities for database migrations and creating initial admin users.
- `/tests` - Scratchpad scripts and test scripts (e.g., `test_extractor.py`, `test_vision.py`) used during development.
- `/uploads` - Temporary storage for uploaded invoice files before they are processed.

## Running the Backend

Ensure you have your virtual environment activated:
```bash
venv\Scripts\activate
python run.py
```
The API will be available at `http://localhost:8000`.
API Documentation (Swagger UI) is available at `http://localhost:8000/docs`.
