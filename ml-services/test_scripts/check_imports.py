"""Check for optional and required Python packages used by ml-services.
Runs a quick import test and prints friendly guidance if imports fail.
"""
import sys
from importlib import import_module

REQUIRED = [
    'fastapi',
    'uvicorn',
    'pydantic',
    'numpy',
    'requests',
    'pillow',
    'pdfplumber',
    'sentence_transformers',
]

OPTIONAL = [
    'faiss',
    'torch',
    'pytesseract',
    'selenium',
]

print('Checking required packages...')
for pkg in REQUIRED:
    try:
        import_module(pkg)
        print(f'  OK: {pkg}')
    except Exception as e:
        print(f'  MISSING: {pkg}  -- {e}')

print('\nChecking optional packages...')
for pkg in OPTIONAL:
    try:
        import_module(pkg)
        print(f'  OK: {pkg}')
    except Exception as e:
        print(f'  NOT INSTALLED: {pkg}  -- {e}')

sys.exit(0)
