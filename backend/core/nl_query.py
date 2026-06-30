"""
Retrieval-Augmented Generation (RAG) using pgvector and Ollama.
Instead of generating SQL, this searches document embeddings and generates a conversational answer.
"""
import logging
from typing import Any, Dict
from sqlalchemy import text
from sqlalchemy.orm import Session

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import config
from core.embeddings import get_embedding

logger = logging.getLogger(__name__)

_rag_llm = None

def _get_rag_llm():
    global _rag_llm
    if _rag_llm is None:
        _rag_llm = ChatOllama(
            model=config.OLLAMA_TEXT_MODEL,
            base_url=config.OLLAMA_HOST,
            temperature=0.3,
            keep_alive="10m",
        )
    return _rag_llm

_rag_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful AI assistant for an invoice management system.
You answer user questions based ONLY on the provided context retrieved from the database.
If you cannot find the answer in the context, say so clearly. Do not make up information.
Keep your answer professional and concise."""),
    ("human", "Context:\n{context}\n\nQuestion: {question}")
])
_parser = StrOutputParser()

def build_context(db: Session, query_embedding: list[float], limit: int = 5) -> str:
    """Retrieve top semantic matches from invoices and notes."""
    context_chunks = []
    
    # We must cast the query_embedding array to a vector type in the query
    vector_str = "[" + ",".join(map(str, query_embedding)) + "]"
    
    # 1. Search Invoices
    try:
        sql_invoices = text("""
            SELECT id, invoice_number, invoice_details, raw_text, 
                   1 - (embedding <=> cast(:vector as vector)) AS similarity
            FROM invoices 
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> cast(:vector as vector) 
            LIMIT :limit
        """)
        results = db.execute(sql_invoices, {"vector": vector_str, "limit": limit}).fetchall()
        for r in results:
            if r.similarity > 0.3:  # Only include somewhat relevant stuff
                context_chunks.append(
                    f"--- INVOICE #{r.invoice_number} (ID: {r.id}) ---\n"
                    f"Details: {r.invoice_details}\nText Extract: {(r.raw_text or '')[:500]}..."
                )
    except Exception as e:
        logger.error(f"Vector search on invoices failed: {e}")

    # 2. Search Notes
    try:
        sql_notes = text("""
            SELECT id, target_type, target_id, content,
                   1 - (embedding <=> cast(:vector as vector)) AS similarity
            FROM notes
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> cast(:vector as vector)
            LIMIT :limit
        """)
        results = db.execute(sql_notes, {"vector": vector_str, "limit": limit}).fetchall()
        for r in results:
            if r.similarity > 0.3:
                context_chunks.append(
                    f"--- NOTE (ID: {r.id}) attached to {r.target_type} {r.target_id} ---\n"
                    f"Content: {r.content}"
                )
    except Exception as e:
        logger.error(f"Vector search on notes failed: {e}")

    if not context_chunks:
        return "No relevant documents found."
    return "\n\n".join(context_chunks)

async def ask_rag(db: Session, question: str) -> Dict[str, Any]:
    """Execute the RAG pipeline for natural language query."""
    try:
        # 1. Generate query embedding
        query_embedding = get_embedding(question)
        if not query_embedding:
            return {"answer": "Failed to generate embeddings. Check Ollama connection.", "error": True}

        # 2. Retrieve context
        context = build_context(db, query_embedding)

        # 3. Generate answer
        chain = _rag_prompt | _get_rag_llm() | _parser
        answer = await chain.ainvoke({
            "context": context,
            "question": question
        })

        return {
            "answer": answer,
            "context_used": context,
            "error": None
        }

    except Exception as e:
        logger.error(f"RAG Error: {e}")
        return {
            "answer": f"Sorry, an error occurred during RAG processing: {e}",
            "error": str(e)
        }
