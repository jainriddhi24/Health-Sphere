"""
ocr_service: Extracts text from PDF/image reports. Uses pytesseract for images
and pdfminer or PyPDF2 for PDFs. Minimal fallback behaviour.
"""
from typing import Optional, Tuple, Dict
import io
from PIL import Image, ImageOps, ImageFilter
try:
    from pdf2image import convert_from_path
except Exception:
    convert_from_path = None
try:
    import pytesseract
except Exception:
    pytesseract = None
try:
    import pdfplumber
except Exception:
    pdfplumber = None
try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None
import os
import logging
import platform

logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

def _preprocess_image(img: Image.Image) -> Image.Image:
    """Apply common preprocessing steps before OCR to improve results.

    Steps:
    - convert to L (grayscale)
    - auto contrast
    - resize if too small
    - median filter
    - simple thresholding
    """
    try:
        img = img.convert('L')
        # Resize small images to improve OCR
        w, h = img.size
        if w < 800:
            factor = 800 / max(1, w)
            img = img.resize((int(w * factor), int(h * factor)), Image.BICUBIC)
        img = ImageOps.autocontrast(img)
        img = img.filter(ImageFilter.MedianFilter())
        # Basic thresholding
        img = img.point(lambda p: 255 if p > 140 else 0)
    except Exception:
        logger.debug('Image preprocessing failed', exc_info=True)
    return img


def extract_text(file_path: str) -> str:
    """Extract text from a PDF or image file.

    Args:
        file_path: path to the uploaded file on disk

    Returns:
        A single string with the extracted text or empty string on failure.
    """
    if not os.path.exists(file_path):
        return ""

    ext = os.path.splitext(file_path)[1].lower()

    # Support simple text files for tests and debug
    if ext in ('.txt', '.md'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            logger.exception('Failed to read text file for OCR fallback')

    # Process PDF
    if ext == '.pdf':
        joined = ""
        # Try pdfplumber first (if available)
        if pdfplumber is not None:
            try:
                with pdfplumber.open(file_path) as pdf:
                    pages = [p.extract_text() or "" for p in pdf.pages]
                joined = "\n\n".join(pages)
            except Exception:
                logger.exception('pdfplumber: failed to extract text from PDF; will try PyPDF2 fallback')
                joined = ""
        # If pdfplumber didn't yield text, try PyPDF2 (PdfReader) as fallback
        if (not joined.strip()) and PdfReader is not None:
            try:
                reader = PdfReader(file_path)
                pages = [page.extract_text() or "" for page in reader.pages]
                joined = "\n\n".join(pages)
            except Exception:
                logger.exception('PyPDF2: failed to extract text from PDF')
                joined = ""

        # If text is absent, attempt to render PDF pages to images and OCR them
        if not joined.strip():
            # If no text found in PDF as text, try rasterizing pages and OCR
            if convert_from_path is not None and pytesseract is not None:
                logger.info('No text extracted from PDF, attempting image render + OCR')
                try:
                    poppler_path = os.environ.get('POPPLER_PATH')
                    dpi = int(os.environ.get('PDF_OCR_DPI', '300'))
                    if poppler_path:
                        images = convert_from_path(file_path, dpi=dpi, poppler_path=poppler_path)
                    else:
                        images = convert_from_path(file_path, dpi=dpi)
                    text_pages = []
                    for img in images:
                        img = _preprocess_image(img)
                        # allow some config flags to tune OCR
                        psm = os.environ.get('TESSERACT_PSM')
                        lang = os.environ.get('TESSERACT_LANG')
                        cfg = ''
                        if psm:
                            cfg += f' --psm {psm}'
                        if lang:
                            # pytesseract accepts lang param
                            page_text = pytesseract.image_to_string(img, lang=lang, config=cfg)
                        else:
                            page_text = pytesseract.image_to_string(img, config=cfg)
                        text_pages.append(page_text)
                    return "\n\n".join(text_pages)
                except Exception:
                    logger.exception('PDF -> Image OCR fallback failed')
            # If OCR fallback didn't run or failed, return whatever we have
        return joined
    # Else: treat as image file
    else:
        try:
            _tess_env = os.environ.get('TESSERACT_CMD') or os.environ.get('TESSERACT_PATH')
            if _tess_env:
                pytesseract.pytesseract.tesseract_cmd = _tess_env
            elif platform.system() == 'Windows':
                # Common Windows installation paths
                default_paths = [
                    r"C:\Program Files\Tesseract OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                ]
                for p in default_paths:
                    if os.path.exists(p):
                        pytesseract.pytesseract.tesseract_cmd = p
                        logger.info('Configured Tesseract at %s', p)
                        break
        except Exception:
            logger.debug('tesseract cmd configuration failed', exc_info=True)
        if pytesseract is None:
            logger.warning('pytesseract is not installed or could not be imported; image OCR will be skipped')
            return ""
        try:
            img = Image.open(file_path)
            # Convert to grayscale and autoregulate contrast
            img = _preprocess_image(img)
            psm = os.environ.get('TESSERACT_PSM')
            lang = os.environ.get('TESSERACT_LANG')
            cfg = ''
            if psm:
                cfg += f' --psm {psm}'
            if lang:
                text = pytesseract.image_to_string(img, lang=lang, config=cfg)
            else:
                text = pytesseract.image_to_string(img, config=cfg)
            return text
        except Exception:
            logger.exception('Image OCR failed')
            return ""
    # best-effort fallback
    return ""
