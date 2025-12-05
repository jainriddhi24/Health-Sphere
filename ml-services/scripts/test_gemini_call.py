"""
Run a local test of the Gemini API adapter using your GOOGLE_API_KEY (set as env var).
Note: Do NOT hardcode your API key here. Set it in your shell only.
"""
import os
from app.services.gemini_api import call_gemini


def run_test():
    prompt = {
        'system': 'You are a medical report interpreter. Use only facts and evidence.',
        'user': 'FACTS:\nfasting_glucose: 160\nEVIDENCE:\nID: id1\nFasting glucose: 160 mg/dL',
        'required_fields': ['fasting_glucose']
    }
    print('API Key set:', bool(os.getenv('GOOGLE_API_KEY')))
    resp = call_gemini(prompt)
    print('Response:', resp)


if __name__ == '__main__':
    run_test()
