import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from api.routes.dashboard import router as dashboard_router

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.database import init_db, seed_default_categories, seed_default_admin
from api.routes import upload, invoices, stats, json_files, query, auth, products, categories, tracking, pws, notes, quality, inventory, devices, monitoring, groups
from api.dependencies import get_current_active_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Invoice Scanner API...")
    init_db()
    seed_default_categories()
    seed_default_admin()
    logger.info("Database initialized.")
    yield
    from core.ollama_client import ollama
    await ollama.close()
    logger.info("Shutting down.")


app = FastAPI(
    title="Invoice Scanner API",
    description="Local invoice scanning and data extraction using Ollama LLM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(upload.router)
app.include_router(invoices.router, dependencies=[Depends(get_current_active_user)])
app.include_router(stats.router)
app.include_router(json_files.router, dependencies=[Depends(get_current_active_user)])
app.include_router(query.router, dependencies=[Depends(get_current_active_user)])

app.include_router(products.router, dependencies=[Depends(get_current_active_user)])
app.include_router(categories.router, dependencies=[Depends(get_current_active_user)])
app.include_router(tracking.router, dependencies=[Depends(get_current_active_user)])
app.include_router(pws.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(notes.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(quality.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(inventory.router, dependencies=[Depends(get_current_active_user)])
app.include_router(devices.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(monitoring.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(groups.router, prefix="/api", dependencies=[Depends(get_current_active_user)])
app.include_router(dashboard_router)


@app.get("/api")
def root():
    return {"message": "Invoice Scanner API", "docs": "/docs"}


notes_uploads_dir = Path(__file__).parent.parent / "uploads" / "notes"
notes_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/notes", StaticFiles(directory=str(notes_uploads_dir)), name="notes_uploads")

quality_uploads_dir = Path(__file__).parent.parent / "uploads" / "quality"
quality_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads/quality", StaticFiles(directory=str(quality_uploads_dir)), name="quality_uploads")

frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
    logger.info(f"Serving frontend from {frontend_dist}")