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
DATA_DIR = BASE_DIR / "data"

# UPLOAD_DIR: prefer an explicit env var (set to /app/uploads in Docker),
# otherwise fall back to a sibling "uploads" folder next to this file.
# Always resolved to an absolute path so stored file_path values are portable.
_upload_env = os.getenv("UPLOAD_DIR", "").strip()
UPLOAD_DIR = Path(_upload_env).resolve() if _upload_env else (BASE_DIR / "uploads").resolve()

# Ensure directories exist at import time
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── Database ─────────────────────────────────────────────────────────────────
_custom_db_url = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL: str = _custom_db_url if _custom_db_url else f"sqlite:///{DATA_DIR / 'invoices.db'}"

# ─── Ollama ───────────────────────────────────────────────────────────────────
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_TEXT_MODEL: str = os.getenv("OLLAMA_TEXT_MODEL", "qwen2.5:3b")
OLLAMA_VISION_MODEL: str = os.getenv("OLLAMA_VISION_MODEL", "moondream:latest")
OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "180"))

# ─── Authentication (JWT) ─────────────────────────────────────────────────────
# In production, set this to a strong random string in your .env file
# e.g., openssl rand -hex 32
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

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

# ─── Notifications (SMTP) ──────────────────────────────────────────────────────
# Leave SMTP_HOST empty to disable outbound email — notification rows will
# still be logged with status="skipped" so the Monitoring UI shows why nothing
# was sent.
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME or "noreply@aiq-platform.local")
SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "AIQ Platform")