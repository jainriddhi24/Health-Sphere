import importlib

packages = ['requests', 'pytesseract', 'pdfplumber', 'sentence_transformers']

for pkg in packages:
    try:
        mod = importlib.import_module(pkg)
        print(f'{pkg}: OK (version: {getattr(mod, "__version__", "unknown")})')
    except Exception as e:
        print(f'{pkg}: NOT INSTALLED or FAILED TO IMPORT ({str(e)})')
