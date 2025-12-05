# Start all dev services (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-all.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Utility to start a service in a new PowerShell window
function Start-ServiceWindow($name, $path, $command) {
    $psArgs = "-NoExit -Command \"cd '$path'; $command\""
    Write-Host "Starting $name in a new window: $command" -ForegroundColor Cyan
    Start-Process powershell -ArgumentList $psArgs -WorkingDirectory $path
}

# Backend (Node) dev
$backendPath = Join-Path $root "backend"
Start-ServiceWindow "backend" $backendPath "npm run dev"

# ML service (Python Uvicorn)
$mlPath = Join-Path $root "ml-services"
# Use venv activation if venv exists; otherwise assume uvicorn is available in PATH
$venvActivate = Join-Path $mlPath "venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Start-ServiceWindow "ml-services" $mlPath ".\venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --port 8000"
} else {
    Start-ServiceWindow "ml-services" $mlPath "python -m uvicorn app.main:app --reload --port 8000"
}

# Frontend (Next.js)
$frontendPath = Join-Path $root "frontend"
Start-ServiceWindow "frontend" $frontendPath "npm run dev"

Write-Host "Started backend, ml-service, and frontend in separate PowerShell windows." -ForegroundColor Green
