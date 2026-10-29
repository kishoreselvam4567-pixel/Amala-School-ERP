@echo off
title Start Amala ERP Backend Service
echo Starting Amala ERP Backend in background full-time...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-backend-service.ps1"
pause

