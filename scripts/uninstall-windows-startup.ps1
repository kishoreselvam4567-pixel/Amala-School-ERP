# scripts/uninstall-windows-startup.ps1
$startupDir = [Environment]::GetFolderPath('Startup')
$destShortcut = Join-Path $startupDir "Amala-ERP-Backend.vbs"

if (Test-Path $destShortcut) {
    Remove-Item -Path $destShortcut -Force
    Write-Host "[REMOVED] Amala School ERP Backend removed from Windows Startup."
} else {
    Write-Host "[INFO] No startup script found in $startupDir."
}

