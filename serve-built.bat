@echo off
echo ===========================================
echo   Serving Built MOA & LO Tracking System
echo ===========================================
echo.

cd /d "c:\Users\Windows 10\Downloads\MOA&LO_Figma"

echo Starting backend server in background...
start /B "MOA-LO Backend" node server.js

echo Waiting for backend to initialize...
timeout /t 2 /nobreak > nul

echo Starting built app server...
start "MOA-LO Built App" cmd /k "node serve-dist.js"

echo Waiting for app server to start...
timeout /t 2 /nobreak > nul

echo Opening application in browser...
start http://localhost:8080

echo.
echo ===========================================
echo   Application Served!
echo ===========================================
echo.
echo - Built App: http://localhost:8080
echo - Backend:   http://localhost:3001
echo - Close terminal windows when done
echo.
pause