"""
Check that the `GOOGLE_API_KEY` env var is set and attempt a light test call to the Generative Language API endpoint.

This prints a short diagnostic and returns HTTP status text; do not include your API key in logs.

Usage (PowerShell):
    $env:GOOGLE_API_KEY = 'ya29.YOUR_KEY'
    python scripts/check_gemini_key.py

If you have a project-specific model, set the `GEMINI_MODEL` env var (defaults to `models/gemini-2.5-flash`).
"""

import os
import json
import sys

try:
    import google.generativeai as genai
except Exception as e:
    print('ERROR: google-generativeai package is not installed. Please run: python -m pip install google-generativeai')
    sys.exit(2)

API_KEY = os.getenv('GOOGLE_API_KEY')
MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

if not API_KEY:
    print('GOOGLE_API_KEY environment variable not set. Please set it and re-run.\n')
    print('PowerShell: $env:GOOGLE_API_KEY = "ya29.YOUR_KEY"')
    sys.exit(1)

print('Testing model:', MODEL)

try:
    genai.configure(api_key=API_KEY)
    # First, list available models to see what's available
    print('Available models:')
    for model in genai.list_models():
        print(f'  - {model.name}')
    print()
    
    model = genai.GenerativeModel(MODEL)
    response = model.generate_content('Test request to verify API key validity and connectivity (one-line reply).')
    print('Response:', response.text[:100])
    print('\nSUCCESS: Your API key appears valid and reachable.')
except Exception as e:
    print('ERROR: API request failed:', str(e))
    print('Check your API key, model name, and quota. If the error mentions authentication, the key is invalid or lacks permissions.')
    sys.exit(3)

