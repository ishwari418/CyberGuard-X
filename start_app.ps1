Write-Host "Starting Guardian Shield..." -ForegroundColor Cyan

# Mobile/API Dependencies
Write-Host "Installing API Dependencies..." -ForegroundColor Yellow
Push-Location "services/api"
npm install
Pop-Location

# Python Dependencies
Write-Host "Installing Python Dependencies..." -ForegroundColor Yellow
python -m pip install fastapi uvicorn sqlalchemy python-multipart python-jose[cryptography] passlib requests httpx google-generativeai python-dotenv bcrypt==3.2.0 Pillow opencv-python-headless pyzbar

# API (Background)
Write-Host "Launching API Service..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k cd services/api && npm run dev" -WindowStyle Normal

# Backend (Background)
Write-Host "Launching ML Backend..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k python -m services.ml-engine.main" -WindowStyle Normal

# Frontend (Background)
Write-Host "Launching Frontend Server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k python -m http.server 8000 --directory legacy/frontend" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Opening Application in Browser..." -ForegroundColor Cyan
Start-Process "http://localhost:8000/index.html"

Write-Host "Guardian Shield Started!" -ForegroundColor Cyan
