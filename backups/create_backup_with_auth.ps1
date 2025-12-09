# Database Backup Script (requires Supabase CLI authentication)
# Run: supabase login (first time only)
# Then run this script

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups/database_backup_$timestamp.sql"

Write-Host "=========================================="
Write-Host "Creating Database Backup"
Write-Host "=========================================="
Write-Host ""
Write-Host "Backup file: $backupFile"
Write-Host ""

# Check if Docker is running
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host " Docker is not running!"
    Write-Host "Please start Docker Desktop first."
    exit 1
}

Write-Host " Docker is running"
Write-Host ""
Write-Host "Creating backup..."
Write-Host ""

# Ensure backups directory exists
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Use Supabase CLI with linked project
supabase db dump --linked -f $backupFile

if (Test-Path $backupFile) {
    $file = Get-Item $backupFile
    if ($file.Length -gt 1000) {
        Write-Host ""
        Write-Host " SUCCESS! Backup created!"
        Write-Host ""
        Write-Host "File: $($file.Name)"
        Write-Host "Size: $([math]::Round($file.Length/1KB, 2)) KB"
        Write-Host "Location: $($file.FullName)"
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host " Backup file is small. Checking contents..."
        Get-Content $backupFile | Select-Object -First 10
    }
} else {
    Write-Host ""
    Write-Host " Backup failed. Make sure you've run: supabase login"
    Write-Host ""
}
