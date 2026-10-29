@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo Starting ReLife AI Platform (Intelligent Product Recovery)
echo ===================================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo [1/3] Checking Backend environment...
cd /d "%BACKEND_DIR%"
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
)

if not exist "relife.db" (
    echo Seeding SQLite database with sample returns data...
    set "PYTHONPATH=%BACKEND_DIR%"
    call .venv\Scripts\activate.bat
    python seed.py
)

echo [2/3] Starting FastAPI Backend on http://localhost:8000...
start "ReLife Backend (FastAPI)" /d "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting Next.js Frontend on http://localhost:3000...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
start "ReLife Frontend (Next.js)" /d "%FRONTEND_DIR%" cmd /k "npm run dev"

echo.
echo ===================================================
echo ReLife AI is launching!
echo Backend Docs:  http://localhost:8000/docs
echo Dashboard UI:  http://localhost:3000
echo ===================================================
echo Opening dashboard in default browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000
