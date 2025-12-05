#!/usr/bin/env python3
"""Quick script to check Tesseract presence and configured path.
"""
import os
import sys
try:
    import pytesseract
    from pytesseract import pytesseract as pt
except Exception as e:
    print('pytesseract import failed:', e)
    sys.exit(1)

path_env = os.environ.get('TESSERACT_CMD') or os.environ.get('TESSERACT_PATH')
print('TESSERACT_CMD env:', path_env)
try:
    print('pytesseract.pytesseract.tesseract_cmd:', pt.tesseract_cmd)
except Exception:
    print('pytesseract.pytesseract.tesseract_cmd: Not set')

try:
    version = pt.get_tesseract_version()
    print('Tesseract version:', version)
except Exception as e:
    print('Could not get Tesseract version; may not be installed or in PATH:', e)

sys.exit(0)
