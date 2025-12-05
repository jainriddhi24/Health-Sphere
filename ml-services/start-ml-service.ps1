# Start ML Service with Google Gemini API configured

# Environment variables: set them manually or export them from your shell/ci.
# For security, do not hardcode API keys here. Instead, export them from your environment
# or set them in a .env file which is in .gitignore. If you prefer to set them here for
# local testing, uncomment and add the correct values.
# $env:GOOGLE_API_KEY = "ya29.YOUR_API_KEY"
$env:GEMINI_MODEL = "gemini-2.5-flash"
$env:GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1p1beta1/models/gemini-2.5-flash:generateContent"
$env:ML_SERVICE_URL = "http://localhost:8000"

# Change to ML services directory
Set-Location "C:\Health-Sphere\ml-services"

Write-Host "Starting HealthSphere ML Service..." -ForegroundColor Green
if ($env:GOOGLE_API_KEY) {
	Write-Host "Google Gemini API Key is set; not printing it for security reasons" -ForegroundColor Yellow
} else {
	Write-Host "Google Gemini API Key not set - please set GOOGLE_API_KEY or GEMINI_API_KEY in your environment or .env file" -ForegroundColor Red
}
Write-Host "Endpoint: $($env:GEMINI_ENDPOINT)" -ForegroundColor Yellow

# Start the service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
