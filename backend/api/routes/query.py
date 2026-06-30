"""
Natural Language Query routes (now using RAG via pgvector).
"""
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from api.dependencies import get_current_active_user
from core.nl_query import ask_rag

router = APIRouter(prefix="/api/query", tags=["query"])

class NLQueryRequest(BaseModel):
    question: str

@router.post("/nl", dependencies=[Depends(get_current_active_user)])
async def run_nl_query(req: NLQueryRequest, db: Session = Depends(get_db)):
    """Run a natural language RAG query against the database."""
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question is required.")
        
    start = time.time()
    result = await ask_rag(db, req.question.strip())
    result["execution_time_ms"] = int((time.time() - start) * 1000)
    
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["answer"])
        
    return result
