# Development setup script (PowerShell)
# Installs dependencies and prepares virtualenv for ml-services

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $root

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location -Path "$root/backend"
npm install

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location -Path "$root/frontend"
npm install

Write-Host "Preparing ML service venv and installing requirements..." -ForegroundColor Cyan
Set-Location -Path "$root/ml-services"
if (!(Test-Path "venv")) {
  Write-Host "Creating virtual environment..."
  python -m venv venv
}
# Activate and install requirements
$activate = "venv\Scripts\Activate.ps1"
if (Test-Path $activate) {
  Write-Host "Activating virtual environment and installing requirements..."
  & $activate
  python -m pip install -r requirements.txt
} else {
  Write-Host "Venv activation script not found; ensure Python is installed and add uvicorn to PATH to use concurrent start" -ForegroundColor Yellow
}

Write-Host "Setup complete. Run `npm run dev:all` or `npm run dev:all:ps` to start all services." -ForegroundColor Green
