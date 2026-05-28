"""
Central configuration for the Invoice Scanner backend.
All settings can be overridden via environment variables or a .env file.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
DATA_DIR = BASE_DIR / "data"

# Ensure directories exist at import time
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── Database ─────────────────────────────────────────────────────────────────
_custom_db_url = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL: str = _custom_db_url if _custom_db_url else f"sqlite:///{DATA_DIR / 'invoices.db'}"

# ─── Ollama ───────────────────────────────────────────────────────────────────
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_TEXT_MODEL: str = os.getenv("OLLAMA_TEXT_MODEL", "llama3.1")
OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "llava:7b")
OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "180"))

# ─── Tesseract OCR ────────────────────────────────────────────────────────────
TESSERACT_CMD: str = os.getenv(
    "TESSERACT_CMD",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)

# ─── Processing Thresholds ────────────────────────────────────────────────────
OCR_CONFIDENCE_THRESHOLD: int = int(os.getenv("OCR_CONFIDENCE_THRESHOLD", "60"))
EXTRACTION_CONFIDENCE_THRESHOLD: float = float(
    os.getenv("EXTRACTION_CONFIDENCE_THRESHOLD", "0.65")
)
MAX_CONCURRENT_JOBS: int = int(os.getenv("MAX_CONCURRENT_JOBS", "3"))
MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024

# ─── Supported file types ─────────────────────────────────────────────────────
SUPPORTED_IMAGE_EXTENSIONS: set[str] = {
    ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp", ".bmp"
}
SUPPORTED_PDF_EXTENSIONS: set[str] = {".pdf"}
SUPPORTED_EXTENSIONS: set[str] = SUPPORTED_IMAGE_EXTENSIONS | SUPPORTED_PDF_EXTENSIONS
