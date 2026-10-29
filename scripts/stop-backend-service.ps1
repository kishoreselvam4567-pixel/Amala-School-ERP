# scripts/stop-backend-service.ps1
# Stops the background Django REST Backend process listening on port 8000

$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $connections) {
    Write-Host "[INFO] No backend server is currently running on port 8000."
    exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
    if ($p -gt 0) {
        Write-Host "Terminating backend process PID: $p"
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 1
$check = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $check) {
    Write-Host "[SUCCESS] Backend server stopped."
} else {
    Write-Host "[WARN] Port 8000 still has active connections."
}

