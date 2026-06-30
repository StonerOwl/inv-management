"""
Embedding generation using Ollama's nomic-embed-text model.
Embeddings are generated lazily (only when first needed) to avoid crashing
the backend if Ollama is not yet running at startup.
"""
import logging
import config
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)

# Lazy initialization — only created on first use
_embeddings_model = None

def _get_model():
    """Lazily initialize the embeddings model."""
    global _embeddings_model
    if _embeddings_model is None:
        try:
            _embeddings_model = OllamaEmbeddings(
                model=config.OLLAMA_EMBEDDING_MODEL,
                base_url=config.OLLAMA_HOST
            )
        except Exception as e:
            logger.error(f"Failed to initialize embeddings model: {e}")
            return None
    return _embeddings_model

def get_embedding(text: str) -> list[float] | None:
    """Generate an embedding vector for a given text. Returns None on failure."""
    if not text or not text.strip():
        return None
    model = _get_model()
    if not model:
        logger.error("Embeddings model not available.")
        return None
    try:
        return model.embed_query(text)
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None
