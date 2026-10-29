@echo off
title Amala School ERP - 24/7 Server Runner
echo ============================================================
echo   STARTING AMALA SCHOOL ERP (BACKEND + FRONTEND)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Django REST Backend on http://127.0.0.1:8000 ...
start "Amala ERP Backend (Django 8000)" cmd /k "backend\venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Portal on http://localhost:3000 ...
start "Amala ERP Frontend (Port 3000)" cmd /k "npx serve . -p 3000"

echo.
echo ============================================================
echo   Amala School ERP is running!
echo   Frontend: http://localhost:3000
echo   Backend : http://127.0.0.1:8000
echo ============================================================
echo You can close this window now. The servers run in background windows.
pause

