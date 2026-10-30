# scripts/start-backend-service.ps1
# Starts the Django REST Backend as a detached, full-time background process on Windows

$rootDir = "D:\Amala-School-ERP"
$pythonPath = "$rootDir\backend\venv\Scripts\python.exe"
$managePy = "$rootDir\backend\manage.py"
$cmdLine = "`"$pythonPath`" `"$managePy`" runserver 0.0.0.0:8000 --noreload"

# Check if already listening on port 8000
$existing = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[OK] Backend server is ALREADY running full-time on port 8000 (PID: $($existing.OwningProcess | Select-Object -First 1))."
    exit 0
}

Write-Host "Spawning full-time background Django process..."
$processClass = [wmiclass]"Win32_Process"
$result = $processClass.Create($cmdLine, $rootDir, $null)

if ($result.ReturnValue -eq 0) {
    Write-Host "[SUCCESS] Django backend started in background with PID: $($result.ProcessId)"
    Start-Sleep -Seconds 2
    $check = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($check) {
        Write-Host "[VERIFIED] Backend is actively listening on http://0.0.0.0:8000 (accessible on laptop & mobile)"
    }
} else {
    Write-Host "[ERROR] Failed to start backend, return code: $($result.ReturnValue)"
}

