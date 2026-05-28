"""
Async HTTP client for the Ollama REST API.
Supports text generation and vision (multimodal) models.
"""
import base64
import json
import logging
from pathlib import Path
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

    async def generate(
        self,
        prompt: str,
        model: str = config.OLLAMA_TEXT_MODEL,
        system: Optional[str] = None,
        temperature: float = 0.1,  # Low temp for deterministic extraction
    ) -> str:
        """Send a text prompt and return the full response string."""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": 2048,
            },
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(
                    f"{self.host}/api/generate",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "").strip()
            except httpx.TimeoutException:
                raise RuntimeError(
                    f"Ollama timed out after {self.timeout}s. "
                    "Try a smaller model or increase OLLAMA_TIMEOUT."
                )
            except httpx.ConnectError:
                raise RuntimeError(
                    f"Cannot connect to Ollama at {self.host}. "
                    "Make sure Ollama is running: `ollama serve`"
                )

    async def generate_with_image(
        self,
        prompt: str,
        image_path: Path,
        model: str = config.OLLAMA_VISION_MODEL,
        system: Optional[str] = None,
    ) -> str:
        """Send a prompt with an image (base64 encoded) to a vision model."""
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "images": [img_b64],
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 2048,
            },
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.post(
                    f"{self.host}/api/generate",
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json().get("response", "").strip()
            except httpx.TimeoutException:
                raise RuntimeError(f"Vision model timed out after {self.timeout}s.")
            except httpx.ConnectError:
                raise RuntimeError(f"Cannot connect to Ollama at {self.host}.")

    async def list_models(self) -> list[dict]:
        """List all locally available Ollama models."""
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                resp = await client.get(f"{self.host}/api/tags")
                resp.raise_for_status()
                return resp.json().get("models", [])
            except Exception:
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


def extract_json_from_response(response: str) -> dict:
    """
    Robustly extract a JSON object from LLM response text.
    Handles markdown code blocks, trailing text, and partial JSON.
    """
    text = response.strip()

    # Remove markdown code fences
    for fence in ["```json", "```JSON", "```"]:
        if fence in text:
            text = text.split(fence, 1)[-1]
            if "```" in text:
                text = text.rsplit("```", 1)[0]
            break

    text = text.strip()

    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    # Try parsing the whole text as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not extract JSON from LLM response: {e}\n\nRaw: {text[:500]}")


# Singleton client instance
ollama = OllamaClient()
