@echo off
echo.
echo  PrepUp — Placement Intelligence Platform
echo  ======================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo  [1/2] Starting Node API on http://localhost:5000 ...
start "PrepUp API" cmd /k "cd /d "%BACKEND%" && npm run dev"

timeout /t 3 /nobreak > nul

echo  [2/2] Starting PrepUp frontend on http://localhost:5173 ...
start "PrepUp Frontend" cmd /k "cd /d "%FRONTEND%" && npm install --legacy-peer-deps -q && npm run dev"

echo.
echo  Both servers starting in separate windows.
echo.
echo    Frontend : http://localhost:5173
echo    Node API : http://localhost:5000
echo    Python   : http://localhost:8000 (optional: npm run dev:python)
echo.
pause
