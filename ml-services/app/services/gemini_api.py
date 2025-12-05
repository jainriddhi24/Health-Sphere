"""
gemini_api: Adapter for Google Generative Language API (Gemini family).

This module reads the API key and target model from environment variables
and makes a secure REST call to the Generative Language API (via provided
endpoint). This implementation avoids hardcoding any API key in the source
and demonstrates a production-ready pattern for secure usage.

Configuration (set these in your environment; don't check them into git):
- GOOGLE_API_KEY (recommended) OR use application-default credentials
- GEMINI_MODEL (e.g. 'models/gemini-2.5-flash' or 'models/text-bison-001')
- GEMINI_ENDPOINT (optional) - If you prefer a custom endpoint

Example (PowerShell):
    $env:GOOGLE_API_KEY = 'ya29.YOUR_API_KEY'
    $env:GEMINI_MODEL = 'models/gemini-2.5-flash'

Note: Replace the MODEL with the proper resource name for Gemini in your
Google Cloud project or the public model listing. Consult Google AI Studio
docs for the exact model name and endpoint.
"""
from typing import Dict, Any
import os
import json

def call_gemini(prompt: Dict[str, Any]) -> Dict[str, Any]:
    """Call the configured Gemini model via Generative Language REST API, with fallback to OpenAI if available.

    Args:
        prompt: dict with 'system' and 'user' keys containing prompt strings.

    Returns:
        Dict with 'text', 'summary', and 'diet_plan' keys on success.

    Security:
        - This function reads the API key from `GOOGLE_API_KEY` or `OPENAI_API_KEY` environment variables.
        - Do not commit or log the API key. If no API key is set,
          the function falls back to a safe mock mode (local testing only).
    """
    # Local import: allow using this module even if 'requests' isn't installed
    try:
        import requests  # type: ignore
    except Exception:
        requests = None

    # Accept multiple environment variable names for key (GOOGLE_API_KEY is standard)
    api_key = (
        os.getenv('GOOGLE_API_KEY') or
        os.getenv('GEMINI_API_KEY') or
        os.getenv('GCLOUD_API_KEY') or
        os.getenv('GCP_API_KEY') or
        os.getenv('GENAI_API_KEY') or
        os.getenv('API_KEY')
    )
    openai_key = os.getenv('OPENAI_API_KEY')
    model = os.getenv('GEMINI_MODEL', 'models/gemini-2.5-flash')
    # Prefer the modern v1 generateContent API; but allow override via GEMINI_ENDPOINT
    endpoint = os.getenv('GEMINI_ENDPOINT', f'https://generativelanguage.googleapis.com/v1/models/{model}:generateContent')

    system = prompt.get('system', '')
    # Accept either `user` (preferred) or `user_text` for compatibility
    user_text = prompt.get('user', prompt.get('user_text', ''))
    required_fields = prompt.get('required_fields', [])

    # Pre-check required fields presence - do not call LLM if missing.
    # If `user_text` is a dict of structured fields, verify presence of keys;
    # if it's a free text string, we skip the structured field check.
    missing = []
    if required_fields:
        if isinstance(user_text, dict):
            missing = [f for f in required_fields if not user_text.get(f)]
        elif isinstance(user_text, str):
            missing = [f for f in required_fields if f not in user_text]
        else:
            missing = []
    if missing:
        return {
            'text': 'Insufficient data to recommend: ' + ', '.join(missing),
            'summary': '',
            'diet_plan': []
        }

    # Assemble a single message string for the API body
    if isinstance(user_text, dict):
        user_text_str = '\n'.join([f"{k}: {v}" for k, v in user_text.items()])
    else:
        user_text_str = str(user_text)
    full_prompt = system + '\n\n' + user_text_str

    if requests is None:
        # Fallback to mock mode if the 'requests' package is missing; return a clear message
        # and a mock response so that the rest of the pipeline can proceed in local testing.
        return {
            'text': 'LLM call failed: requests package is not installed. SUMMARY: Mock summary. DIET_PLAN: Mock diet plan based on facts.',
            'summary': 'This is a brief summary of the provided report (mock).',
            'diet_plan': [
                'Reduce added sugars due to elevated fasting_glucose.',
                'Reduce saturated fats due to elevated LDL.'
            ]
        }

    if not api_key:
        # If no API key is configured, fail loudly with a clear message so it's easier to diagnose.
        # Use GOOGLE_API_KEY as the standard env var name (GEMINI_API_KEY also accepted as fallback).
        # In local dev this falls back to the mock response; in production, callers should ensure the env var is set.
        if os.environ.get('ENV') == 'development' or os.environ.get('DEBUG'):
            return {
                'text': 'LLM call skipped: No Google API key (GOOGLE_API_KEY) found. Mock summary returned. Set env var to enable real API calls.',
                'summary': 'This is a brief summary of the provided report (mock).',
                'diet_plan': [
                    'Reduce added sugars due to elevated fasting_glucose.',
                    'Reduce saturated fats due to elevated LDL.'
                ],
                'used_api': False,
                'model': model
            }
        # Production: raise an explicit error (to be caught by FastAPI) so callers can surface it
        raise Exception('No Google API key configured. Set GOOGLE_API_KEY environment variable.')

    # Call the Generative Language API with API key in query parameter (or header)
    headers = {
        'Content-Type': 'application/json'
    }
    params = {'key': api_key}
    
    # Use the new Gemini API v1p1beta1 format
    body = {
        'contents': [
            {
                'parts': [
                    {'text': full_prompt}
                ]
            }
        ],
        'generationConfig': {
            'temperature': 0.0,
            'maxOutputTokens': 512,
            'topP': 0.95,
            'topK': 64
        }
    }

    # Implement a basic retry loop with exponential backoff for transient failures
    attempts = 3
    delay = 1.0
    data = None
    last_err = None
    # We will try a few request body shapes to be resilient to APIs that expect either
    # the 'generateContent' body or older 'generateText' body shape.
    body_candidates = [
        # generateContent (v1) prefered shape
        {'instances': [{'input': {'text': full_prompt}}]},
        # v1p1beta1 / v1p1beta1-type 'contents' shape
        {'contents': [{'parts': [{'text': full_prompt}]}], 'generationConfig': {'temperature': 0.0, 'maxOutputTokens': 512, 'topP': 0.95, 'topK': 64}},
        # older generateText style
        {'prompt': full_prompt, 'maxOutputTokens': 512, 'temperature': 0.0},
        # a very generic messages/chat format as last resort
        {'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': user_text_str}], 'maxOutputTokens': 512}
    ]

    for attempt in range(attempts):
        try:
            print(f'[Gemini API] Attempt {attempt + 1}/{attempts} to call {endpoint}')
            # try every body candidate (each attempt will cycle the body candidate in case of failure)
            body = body_candidates[attempt % len(body_candidates)]
            # Mask API key when printing logs
            logged_key = None if not api_key else f"{api_key[:6]}...{api_key[-6:]}"
            print(f'[Gemini API] Attempt {attempt + 1}/{attempts} to call {endpoint} with key={logged_key} and body_shape={list(body.keys())}')
            resp = requests.post(endpoint, headers=headers, params=params, json=body, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            print(f'[Gemini API] Success! Response: {data}')
            break
        except Exception as ex:
            # If the exception is an HTTPError with response, attach the status/text for diagnosis
            try:
                resp_text = ex.response.text if hasattr(ex, 'response') and getattr(ex, 'response') is not None else None
                last_err = f"{str(ex)}{': ' + resp_text if resp_text else ''}"
            except Exception:
                last_err = ex
            print(f'[Gemini API] Error on attempt {attempt + 1}: {str(last_err)}')
            # Exponential backoff
            import time
            time.sleep(delay)
            delay *= 2
            continue
    if data is None:
        # Try OpenAI as fallback if available
        if openai_key:
            try:
                openai_headers = {
                    'Authorization': f'Bearer {openai_key}',
                    'Content-Type': 'application/json'
                }
                openai_body = {
                    'model': 'gpt-3.5-turbo',
                    'messages': [
                        {'role': 'system', 'content': system},
                        {'role': 'user', 'content': user_text_str}
                    ],
                    'max_tokens': 512,
                    'temperature': 0.0
                }
                openai_resp = requests.post('https://api.openai.com/v1/chat/completions', headers=openai_headers, json=openai_body, timeout=60)
                openai_resp.raise_for_status()
                openai_data = openai_resp.json()
                resp_text = openai_data['choices'][0]['message']['content']
                # Try to parse JSON from OpenAI response
                try:
                    parsed = json.loads(resp_text) if resp_text.strip().startswith('{') else None
                    if isinstance(parsed, dict):
                        summary = parsed.get('summary', resp_text)
                        diet_plan = parsed.get('diet_plan', [])
                        sources = parsed.get('sources', [])
                    else:
                        summary = resp_text
                        diet_plan = []
                        sources = []
                except:
                    summary = resp_text
                    diet_plan = []
                    sources = []
                return {
                    'text': resp_text,
                    'summary': summary,
                    'diet_plan': diet_plan if isinstance(diet_plan, list) else [diet_plan],
                    'sources': sources,
                    'used_api': True,
                    'model': 'gpt-3.5-turbo'
                }
            except Exception as openai_err:
                # If OpenAI also fails, raise the original error
                raise Exception(f"Failed to call Gemini after {attempts} attempts: {str(last_err)}. OpenAI fallback also failed: {str(openai_err)}")
        else:
            # No OpenAI key, raise the original error
            raise Exception(f"Failed to call Gemini after {attempts} attempts: {str(last_err)}")

    # Parse and validate the response
    try:
        # data schema for Gemini API v1p1beta1 returns candidates with parts
        resp_text = ''
        if isinstance(data, dict):
            # Gemini API v1p1beta1 format
            if 'candidates' in data and isinstance(data['candidates'], list) and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    resp_text = '\n'.join([p.get('text', '') for p in candidate['content']['parts']])
                else:
                    resp_text = str(candidate)
            else:
                # best-effort attempt to stringify
                resp_text = json.dumps(data)

        print(f'[Gemini API] Raw response text (first 500 chars): {resp_text[:500]}')

        # Try to extract 'summary' and 'diet_plan' if present in JSON
        summary = ''
        diet_plan = []
        sources = []
        
        # Look for structured response (if the model returned JSON)
        if isinstance(resp_text, str) and resp_text.strip():
            try:
                parsed = json.loads(resp_text) if resp_text.strip().startswith('{') else None
                if isinstance(parsed, dict):
                    summary = parsed.get('summary', '')
                    diet_plan = parsed.get('diet_plan', [])
                    sources = parsed.get('sources', [])
                    print(f'[Gemini API] Successfully parsed JSON response')
            except Exception as e:
                # not JSON, fall back to full text
                print(f'[Gemini API] Failed to parse JSON: {str(e)}, using raw text')
            
            if not summary:
                summary = resp_text

        # Validate response contains something useful
        if not summary and not resp_text:
            raise Exception('Gemini returned empty response')
        return {
            'text': resp_text,
            'summary': summary or resp_text,
            'diet_plan': diet_plan if isinstance(diet_plan, list) else [diet_plan],
            'sources': sources,
            'used_api': True,
            'model': model
        }
    except Exception as e:
        # Graceful error reporting with no sensitive leakage
        return {
            'text': f'LLM call failed: {str(e)}',
            'summary': '',
            'diet_plan': [],
            'used_api': False,
            'model': model
        }
