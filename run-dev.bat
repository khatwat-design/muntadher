@echo off
setlocal enabledelayedexpansion
set PORT=5173

rem Kill any process using the dev server port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
)

rem Ensure npm is available
where npm >nul 2>&1
if errorlevel 1 (
  echo npm not found. Please install Node.js and restart.
  pause
  exit /b 1
)

cd /d "%~dp0"
echo Starting API server...
start "mdre-api" cmd /k "npm run server"
echo Starting Vite dev server...
start "mdre-web" cmd /k "npm run dev"
exit /b 0
