@echo off
echo ===========================================
echo   Opening MOA & LO Tracking System
echo ===========================================
echo.

cd /d "c:\Users\Windows 10\Downloads\MOA_LO_Figma"

echo Starting backend server in background...
start /B "MOA-LO Backend" node server.js

echo Waiting for backend to initialize...
timeout /t 2 /nobreak > nul

echo Starting frontend development server...
start "MOA-LO Frontend" cmd /k "npx vite --host --port 5173"

echo.
echo ===========================================
echo   Application Started!
echo ===========================================
echo.
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:3001
echo - Close the terminal windows when done
echo.
pause