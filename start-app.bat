@echo off
echo ===========================================
echo   MOA & LO Tracking System Startup
echo ===========================================
echo.

cd /d "c:\Users\Windows 10\Downloads\MOA_LO_Figma"

echo Starting backend server...
start "MOA-LO Backend" cmd /k "node server.js"

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting frontend development server...
start "MOA-LO Frontend" cmd /k "npx vite --host --port 5173"

echo.
echo ===========================================
echo   Application Started Successfully!
echo ===========================================
echo.
echo Backend API Server: http://localhost:3001
echo Frontend App:       http://localhost:5173
echo Built Version:      dist/index.html
echo.
echo Press any key to close this window...
pause > nul