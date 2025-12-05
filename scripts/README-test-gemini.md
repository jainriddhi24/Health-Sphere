# Test Google Generative AI (Gemini) API script

A small script to test whether your Google API key works with the Generative AI API (Gemini / text-bison).

Usage (PowerShell):

```powershell
# Put your key into an env var only for this session
$env:GEMINI_API_KEY = 'AIzaSy...'
# Run the test script
node .\scripts\test_gemini_api.js
```

Usage (macOS / Linux):

```bash
export GEMINI_API_KEY='AIzaSy...'
node scripts/test_gemini_api.js
```

You can also pass the key as a command-line flag (not recommended):
```bash
node scripts/test_gemini_api.js --key=AIzaSy...
```

Notes:
- The script tries a few common model names. If the key is invalid, expired, or the model is not accessible with the key, you'll get a 401 or 403 or 404 response.
- Don't commit or push your API key into the repository. Use an environment variable or a secrets manager.
 - If your API key is accidentally exposed, immediately revoke it in the Google Cloud Console (APIs & Services > Credentials) and create a new restricted API key (limit by IPs, referrers, and API access).
- If you need to run a specific model (e.g., gemini) and you know the exact name in your Google project, update the `modelsToTry` list in `scripts/test_gemini_api.js`.
- If your project uses restricted API Keys (via referer or IP limits), test from the same environment where it's allowed.

Troubleshooting:
- 401 / 403 -> API key invalid or not authorized for Generative AI API or project not linked correctly
- 404 -> model or endpoint not found
- 503 -> service temporarily unavailable (ML service may be down)

If you want, I can add a small Node script that uses the official Google client library or a server endpoint that runs in your backend (so the key is never exposed to the browser).

Best practices:
- Run generative model tests from a backend or local dev server; never put API keys in client-side code.
- Use environment variables in CI and local dev, restrict keys by IP/referrer, and revoke keys immediately if exposed.