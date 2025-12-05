# HealthSphere ML Microservices

This microservice exposes endpoints for report processing and the premium chatbot.

Run locally with a Python virtual environment and the required dependencies from `requirements.txt`.

Install dependencies:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Note for Windows users and faiss: the `faiss-cpu` package has inconsistent prebuilt wheels across Python versions and platforms. If you run into the pip error similar to:

```
ERROR: Could not find a version that satisfies the requirement faiss-cpu==1.7.4
```

Then either update the dependency (we recommend `faiss-cpu==1.13.0` in `requirements.txt`) or use conda-forge to install a compatible wheel:

```powershell
# Recommended for Windows / where pip fails to find a wheel
conda create -n hs-ml python=3.10 -y
conda activate hs-ml
conda install -c conda-forge faiss-cpu -y
pip install -r requirements.txt --no-deps
```

If you must use a specific older `faiss-cpu` version (e.g. 1.7.4), create an environment with a supported Python version (3.8-3.10) and install there. Building from source is possible but advanced and slow.
  
Pylance & VS Code troubleshooting (imports not found):
- Ensure the correct Python interpreter is selected in VS Code. Select the virtual environment created for `ml-services` (e.g., `ml-services/venv/Scripts/python.exe`).
- Activate the venv and install packages in it (this ensures both runtime and Pylance can resolve imports):
	```powershell
	cd ml-services
	.\venv\Scripts\Activate.ps1  # Windows
	python -m pip install -r requirements.txt
	```
- If `faiss` still throws import errors, on Windows use conda-forge to install `faiss-cpu`:
	```powershell
	conda create -n hs-ml python=3.10 -y
	conda activate hs-ml
	conda install -c conda-forge faiss-cpu -y
	python -m pip install -r requirements.txt --no-deps
	```
	Afterwards, point VS Code to the `hs-ml` conda interpreter.

Quick runtime check:
```powershell
cd ml-services
.\venv\Scripts\Activate.ps1
python test_scripts/check_env.py
```

Tesseract (OCR) setup (Windows)
--------------------------------
If you plan to run OCR-based endpoints (image extraction), install Tesseract on your machine.

- Recommended Windows Installer: https://github.com/UB-Mannheim/tesseract/wiki
- Or use Chocolatey:
```powershell
choco install tesseract -y
```

After installation, either ensure the Tesseract binary is on your PATH or set `TESSERACT_CMD` or `TESSERACT_PATH` to the full path of the executable, e.g.:
```powershell
$env:TESSERACT_CMD = 'C:\Program Files\Tesseract OCR\tesseract.exe'
```

The `ocr_service` module will attempt to auto-detect a common Windows install path (Program Files / Program Files (x86)), but explicitly setting `TESSERACT_CMD` is recommended for reproducible behavior.

PDF rasterization: `pdf2image` needs poppler. On Windows, install poppler and set `POPPLER_PATH` to the poppler bin folder (e.g., `C:\Program Files\poppler-24.0.0\Library\bin`) so `pdf2image` can find `pdftoppm` and other utilities.
Example (PowerShell):
	$env:POPPLER_PATH = 'C:\Program Files\poppler-24.0.0\Library\bin'
You can verify the service and configured executable with the bundled test script:
```powershell
cd ml-services
.\venv\Scripts\Activate.ps1
python test_scripts/check_tesseract.py
```


Also, pip's resolver may ignore older numpy versions for modern Python interpreters (e.g., Python 3.12). If you see warnings like:

```
ERROR: Ignored the following versions that require a different python version: 1.21.2 Requires-Python >=3.7,<3.11
```

Consider using Python 3.10 or 3.11 for maximum compatibility with all packages or update pinned package versions to ones that support Python 3.12.

Recommended Python versions: 3.10 or 3.11 for the broadest compatibility. If you prefer Python 3.12, confirm wheel availability and/or use conda for problematic packages.


Start dev server:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Troubleshooting: `ModuleNotFoundError` when starting with `uvicorn`
---------------------------------------------------------------
If you get `ModuleNotFoundError` (e.g., `No module named 'requests'`), it usually means `uvicorn` is running under a different Python environment than the virtual environment with the installed packages. To avoid this:

1. Activate the venv first (PowerShell):

```powershell
cd ml-services
.\venv\Scripts\Activate.ps1
```

2. Run uvicorn through the venv Python executable (this guarantees the same environment is used):

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Optional: You can install system-wide `uvicorn` but make sure it points to the same interpreter (not recommended).

4. Run the `check_imports.py` helper to verify missing modules:

```powershell
python test_scripts/check_imports.py
```

5. If a package is reported missing, install it in the venv:

```powershell
pip install <package>
# or
pip install -r requirements.txt
```

6. If you still see `ModuleNotFoundError`, ensure the VS Code or terminal process is using the venv's Python interpreter (Ctrl+Shift+P -> Python: Select Interpreter).

```

Endpoints:
- POST /process-report - Process a report by supplying `filePath` to an uploaded file and `userId`.
 - POST /chatbot/ingest_user - Ingest a user-specific document (i.e., `processing_result`) into the FAISS vector store for personalized RAG. Payload: `{ user_id: str, text: str, metadata?: object }`.

New behavior: `ContextAggregator` now includes metadata useful for safe, personalized chatbot replies:
- `metadata.missing_profile_fields` — list of missing user profile fields that the assistant should ask for instead of assuming
- `metadata.follow_up_questions` — suggested user prompts for missing details
- `metadata.report_facts` and `metadata.report_evidence` — parsed numeric facts and evidence snippet references
- `metadata.danger_flags` — list of lab values that are outside the report's provided reference ranges, if available
- `metadata.needs_professional_review` — auto-set when danger flags exist; chat responses should recommend immediate clinical review

The prompt builder and system prompt now instruct the LLM to strictly: use only provided facts and evidence, avoid hallucination, and ask follow-up questions where needed.

Troubleshooting / resolving Pylance import errors

If VS Code (Pylance) reports that modules such as `requests` or other packages cannot be resolved, ensure you have selected the correct Python interpreter in VS Code and installed the dependencies in that environment:

1) Create and activate the venv:
```powershell
cd ml-services
python -m venv venv
.\venv\Scripts\Activate.ps1
```
2) Install dependencies into the venv:
```powershell
pip install -r requirements.txt
```
3) In VS Code, select the interpreter pointing to the venv (Ctrl+Shift+P -> Python: Select Interpreter -> choose `ml-services\venv`).

This ensures Pylance can find and index installed packages, avoiding diagnostics such as "Import 'requests' could not be resolved from source".

## Using Google Gemini / Generative Language API

To integrate with Gemini 2.5 (or other generative models), set the following environment variables in your shell/CI environment and do not commit them to source control:

PowerShell example (temporary for session):
```
$env:GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'
$env:GEMINI_MODEL = 'models/gemini-2.5-flash'
```

Then run the test script:
```
cd ml-services
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/test_gemini_call.py
```

Notes:
- The adapter uses `GEMINI_ENDPOINT` if provided, otherwise it constructs a default Generative Language REST URL.
- If `GOOGLE_API_KEY` is not set, the adapter runs in a local mock mode for development and returns templated example output.
- The module `app.services.gemini_api` demonstrates a secure pattern for calling the API and parsing the response.
