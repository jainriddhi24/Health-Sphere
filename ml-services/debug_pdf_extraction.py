import os
from importlib import import_module

PDF_PATH = r"C:\Health-Sphere\backend\uploads\2a058674-7a18-4774-9495-07dae9688bc7\\1764539380992-jane_doe_report.pdf"

print('PDF path:', PDF_PATH)

# Try imports
pkgs = ['pdfplumber', 'PyPDF2', 'pdf2image', 'pytesseract']
for p in pkgs:
    try:
        import_module(p)
        print(p, '— installed')
    except Exception as e:
        print(p, '— NOT installed:', e)

from shutil import which
print('tesseract binary:', which('tesseract'))
print('POPPLER_PATH env var:', os.environ.get('POPPLER_PATH'))

# Try pdfplumber
try:
    import pdfplumber
    with pdfplumber.open(PDF_PATH) as pdf:
        pages = [p.extract_text() for p in pdf.pages]
    joined = '\n\n'.join([p for p in pages if p])
    print('\n[PDFPLUMBER] Extracted length:', len(joined))
    print('Sample (first 600 chars):')
    print(joined[:600])
except Exception as e:
    print('\n[PDFPLUMBER] Failed:', type(e), e)

# Try PyPDF2
try:
    from PyPDF2 import PdfReader
    reader = PdfReader(PDF_PATH)
    pages = [p.extract_text() for p in reader.pages]
    joined2 = '\n\n'.join([p for p in pages if p])
    print('\n[PyPDF2] Extracted length:', len(joined2))
    print('Sample (first 600 chars):')
    print(joined2[:600])
except Exception as e:
    print('\n[PyPDF2] Failed:', type(e), e)

# Try rasterizing -> pytesseract
try:
    from pdf2image import convert_from_path
    import pytesseract
    images = convert_from_path(PDF_PATH, dpi=300, poppler_path=os.environ.get('POPPLER_PATH'))
    print('\n[pdf2image] Page count:', len(images))
    from PIL import Image
    # take first page and do OCR
    img = images[0]
    txt = pytesseract.image_to_string(img)
    print('\n[PyTesseract] Extracted length:', len(txt))
    print('Sample (first 600 chars):')
    print(txt[:600])
except Exception as e:
    print('\n[pdf2image / pytesseract] Failed:', type(e), e)
