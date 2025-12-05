@echo off
REM Load environment variables and start ML service
cd /d C:\Health-Sphere\ml-services

REM Set environment variables
set GOOGLE_API_KEY=AIzaSyBNl9X6Q-eKoDI7fRnCntsg6784fzFDLvg
set GEMINI_MODEL=gemini-2.5-flash
set GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1p1beta1/models/gemini-2.5-flash:generateContent
set ML_SERVICE_URL=http://localhost:8000

REM Start ML service
echo Starting HealthSphere ML Service...
echo GOOGLE_API_KEY is set
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
