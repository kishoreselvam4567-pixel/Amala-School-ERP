@echo off
title Stop Amala ERP Backend Service
echo Stopping Amala ERP Backend...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\stop-backend-service.ps1"
pause

