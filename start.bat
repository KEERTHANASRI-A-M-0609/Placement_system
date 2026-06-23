@echo off
echo.
echo  CareerOS — Placement Execution System
echo  ======================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo  [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "CareerOS Backend" cmd /k "cd /d "%BACKEND%" && pip install -r requirements.txt -q && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo  [2/2] Starting CareerOS frontend on http://localhost:5173 ...
start "CareerOS Frontend" cmd /k "cd /d "%FRONTEND%" && npm install --legacy-peer-deps -q && npm run dev"

echo.
echo  Both servers starting in separate windows.
echo.
echo    Frontend : http://localhost:5173
echo    Backend  : http://localhost:8000
echo    API Docs : http://localhost:8000/docs
echo.
pause
