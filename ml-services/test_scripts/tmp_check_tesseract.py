from pytesseract import pytesseract as pt
import sys

try:
    print('tesseract_cmd =', repr(pt.tesseract_cmd))
    v = pt.get_tesseract_version()
    print('version:', v)
except Exception as e:
    print('error:', e)
    sys.exit(1)
