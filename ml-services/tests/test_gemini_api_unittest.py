import os
import sys
import unittest
import importlib
import types

# Ensure 'app' package resolves
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.gemini_api import call_gemini
from app.services.prompt_builder import REQUIRED_FIELDS

class TestGeminiAPI(unittest.TestCase):

    def test_mock_response_without_api_key(self):
        # Unset API key
        if 'GOOGLE_API_KEY' in os.environ:
            del os.environ['GOOGLE_API_KEY']

        prompt = {
            'system': 'system',
            'user': 'FACTS:\nfasting_glucose: 160\nHbA1c: 7.5%',
            'required_fields': ['fasting_glucose']
        }
        # Ensure a fake requests module is present so the function reaches api_key check
        sys.modules['requests'] = types.SimpleNamespace(post=lambda *args, **kwargs: None)
        res = call_gemini(prompt)
        self.assertIn('SUMMARY: Mock summary', res['text'])
        self.assertTrue(isinstance(res['diet_plan'], list))

    def test_missing_fields_string_user_text(self):
        # Provide user text which does not contain a required field
        prompt = {
            'system': 'system',
            'user': 'FACTS:\nHbA1c: 7.5%',
            'required_fields': ['fasting_glucose']
        }
        res = call_gemini(prompt)
        self.assertIn('Insufficient data to recommend', res['text'])

    def test_user_text_dict_and_required_fields(self):
        # Provide user as dict with required fields
        prompt = {
            'system': 'system',
            'user': {'fasting_glucose': 150, 'hba1c': 7.3},
            'required_fields': ['fasting_glucose', 'hba1c']
        }
        # Unset API key to trigger mock
        if 'GOOGLE_API_KEY' in os.environ:
            del os.environ['GOOGLE_API_KEY']
        # Ensure a fake requests module is present so the function reaches api_key check
        sys.modules['requests'] = types.SimpleNamespace(post=lambda *args, **kwargs: None)
        res = call_gemini(prompt)

    def test_requests_not_installed_path(self):
        # Simulate 'requests' not installed by causing ImportError for 'requests'
        import builtins
        original_import = builtins.__import__
        def _fake_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == 'requests' or name.startswith('requests'):
                raise ImportError('No module named requests')
            return original_import(name, globals, locals, fromlist, level)
        builtins.__import__ = _fake_import
        prompt = {
            'system': 'system',
            'user': 'FACTS:\nfasting_glucose: 160\nHbA1c: 7.5%',
            'required_fields': ['fasting_glucose']
        }
        try:
            res = call_gemini(prompt)
        finally:
            builtins.__import__ = original_import
        self.assertIn('requests package is not installed', res['text'])
        self.assertIn('SUMMARY: Mock summary', res['text'])

if __name__ == '__main__':
    unittest.main()
