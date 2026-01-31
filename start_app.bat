@echo off
echo Starting Guardian Shield...

echo Installing Dependencies...
python.exe -m pip install --upgrade pip
python.exe -m pip install fastapi uvicorn sqlalchemy python-multipart python-jose[cryptography] passlib requests httpx google-generativeai python-dotenv bcrypt==3.2.0 Pillow opencv-python-headless pyzbar

echo Starting Backend Server...
start "Guardian Backend" cmd /k "python -m services.ml-engine.main || pause"

echo Starting API Service...
cd services/api && call npm install && cd ../..
start "Guardian API" cmd /k "cd services/api && npm run dev || pause"

echo Starting Frontend Server...
start cmd /k "python -m http.server 8000 --directory legacy/frontend"

echo Opening Application...
timeout /t 5
start http://localhost:8000/index.html

echo Done!
