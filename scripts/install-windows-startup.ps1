# scripts/install-windows-startup.ps1
# Configures the backend to automatically start full-time when Windows boots

$startupDir = [Environment]::GetFolderPath('Startup')
$targetScript = "D:\Amala-School-ERP\scripts\run-backend-silent.vbs"
$destShortcut = Join-Path $startupDir "Amala-ERP-Backend.vbs"

Copy-Item -Path $targetScript -Destination $destShortcut -Force
Write-Host "[SUCCESS] Amala School ERP Backend configured for Windows Startup!"
Write-Host "[PATH]: $destShortcut"
Write-Host "The backend will now automatically run 24/7 whenever your computer starts."

