# Database Backup Script
# Run this once Docker Desktop is fully started

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups/database_backup_$timestamp.sql"

Write-Host "=========================================="
Write-Host "Creating Database Backup"
Write-Host "=========================================="
Write-Host ""
Write-Host "Backup file: $backupFile"
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..."
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker is not running!"
    Write-Host ""
    Write-Host "Please start Docker Desktop and wait for it to fully initialize,"
    Write-Host "then run this script again."
    Write-Host ""
    exit 1
}

Write-Host "✓ Docker is running"
Write-Host ""
Write-Host "Creating backup (this may take a minute)..."
Write-Host ""

# Ensure backups directory exists
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

# Set password and create backup using Docker
$env:PGPASSWORD = "OwfRnfvtCcgfKMCrgKJQjeawgWHtSSYW"
docker run --rm -e PGPASSWORD="OwfRnfvtCcgfKMCrgKJQjeawgWHtSSYW" -v "${PWD}:/workspace" -w /workspace postgres:17 pg_dump -h aws-1-us-east-2.pooler.supabase.com -p 5432 -U "cli_login_postgres.okdzllfpsvltjqryslnn" -d postgres > "backups/database_backup_$timestamp.sql" 2>&1

Start-Sleep -Seconds 2

# Check if backup was created successfully
if (Test-Path $backupFile) {
    $file = Get-Item $backupFile
    
    # Check if file has content (errors might be small)
    $content = Get-Content $backupFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "ERROR" -or $content -match "error") {
        Write-Host "✗ Backup failed with errors:"
        Write-Host ""
        Get-Content $backupFile | Select-Object -First 20
        Write-Host ""
        Remove-Item $backupFile -ErrorAction SilentlyContinue
        exit 1
    }
    
    if ($file.Length -gt 1000) {
        Write-Host "✓✓✓ SUCCESS! Backup created successfully!"
        Write-Host ""
        Write-Host "File Details:"
        Write-Host "  Name: $($file.Name)"
        Write-Host "  Size: $([math]::Round($file.Length/1KB, 2)) KB"
        Write-Host "  Created: $($file.LastWriteTime)"
        Write-Host "  Full Path: $($file.FullName)"
        Write-Host ""
        Write-Host "Your database backup is complete!"
        Write-Host ""
    } else {
        Write-Host "⚠ Backup file created but appears small ($($file.Length) bytes)."
        Write-Host "Checking contents..."
        Write-Host ""
        Get-Content $backupFile | Select-Object -First 10
        Write-Host ""
    }
} else {
    Write-Host "✗ Backup file was not created."
    Write-Host ""
    Write-Host "Please check:"
    Write-Host "1. Docker Desktop is running"
    Write-Host "2. You have internet connection"
    Write-Host "3. Database credentials are correct"
    Write-Host ""
    exit 1
}
