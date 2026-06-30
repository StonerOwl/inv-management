"""
Async HTTP client for the Ollama REST API.
Trimmed down since LangChain now handles the prompt generation/extraction pipeline.
This client is now primarily used for system health checks.
"""
import logging
from typing import Any, Optional

import httpx
import config

logger = logging.getLogger(__name__)


class OllamaClient:
    """Async client for the Ollama local LLM server."""

    def __init__(
        self,
        host: str = config.OLLAMA_HOST,
        timeout: int = config.OLLAMA_TIMEOUT,
    ):
        self.host = host.rstrip("/")
        self.timeout = timeout
        # Persistent client — reuses TCP connections across requests (HTTP keep-alive)
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        """Lazily create the persistent HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self) -> None:
        """Close the persistent HTTP client. Call during app shutdown."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def list_models(self) -> list[dict]:
        """List all locally available Ollama models."""
        client = self._get_client()
        try:
            resp = await client.get(f"{self.host}/api/tags")
            resp.raise_for_status()
            return resp.json().get("models", [])
        except Exception as e:
            logger.debug(f"Failed to list models: {e}")
            return []

    async def is_model_available(self, model_name: str) -> bool:
        """Check if a specific model is pulled and available."""
        models = await self.list_models()
        available = [m.get("name", "") for m in models]
        return any(model_name in m for m in available)

    async def health_check(self) -> dict:
        """Check Ollama server health and available models."""
        try:
            models = await self.list_models()
            return {
                "status": "ok",
                "host": self.host,
                "models": [m.get("name") for m in models],
                "text_model": config.OLLAMA_TEXT_MODEL,
                "vision_model": config.OLLAMA_VISION_MODEL,
            }
        except Exception as e:
            return {"status": "error", "error": str(e), "host": self.host}

# Singleton client instance
ollama = OllamaClient()
