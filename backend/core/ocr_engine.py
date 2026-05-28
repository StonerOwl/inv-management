"""
Tesseract OCR engine wrapper with confidence scoring.
"""
import logging
from dataclasses import dataclass

import pytesseract
from PIL import Image

import config

logger = logging.getLogger(__name__)

# Configure Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD

# Tesseract config: OEM 3 (default), PSM 6 (assume uniform block of text)
TESSERACT_CONFIG = r"--oem 3 --psm 6"


@dataclass
class OCRResult:
    text: str
    confidence: float  # 0-100
    word_count: int


def run_ocr(image: Image.Image, lang: str = "eng") -> OCRResult:
    """
    Run Tesseract OCR on a PIL Image.
    Returns extracted text and a mean confidence score.
    """
    try:
        # Get detailed data with confidence per word
        data = pytesseract.image_to_data(
            image,
            lang=lang,
            config=TESSERACT_CONFIG,
            output_type=pytesseract.Output.DICT,
        )

        words = []
        confidences = []
        for i, word in enumerate(data["text"]):
            word = word.strip()
            conf = int(data["conf"][i])
            if word and conf > 0:
                words.append(word)
                confidences.append(conf)

        text = pytesseract.image_to_string(image, lang=lang, config=TESSERACT_CONFIG)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        logger.debug(
            f"OCR complete: {len(words)} words, avg confidence={avg_confidence:.1f}%"
        )
        return OCRResult(
            text=text.strip(),
            confidence=avg_confidence,
            word_count=len(words),
        )
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return OCRResult(text="", confidence=0.0, word_count=0)


def is_tesseract_available() -> bool:
    """Check if Tesseract is installed and accessible."""
    try:
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")
        return True
    except Exception:
        return False
