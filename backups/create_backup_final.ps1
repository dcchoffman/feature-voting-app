# Final Database Backup Script
# This script will create a backup using your Supabase access token

param(
    [Parameter(Mandatory=$false)]
    [string]$AccessToken = ""
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups/database_backup_$timestamp.sql"

Write-Host "=========================================="
Write-Host "Database Backup - Final Method"
Write-Host "=========================================="
Write-Host ""

# Check Docker
Write-Host "Checking Docker..."
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker is not running!"
    Write-Host "Please start Docker Desktop first."
    exit 1
}
Write-Host "✓ Docker is running"
Write-Host ""

# Get access token
if ([string]::IsNullOrEmpty($AccessToken)) {
    if ($env:SUPABASE_ACCESS_TOKEN) {
        $AccessToken = $env:SUPABASE_ACCESS_TOKEN
        Write-Host "✓ Using access token from environment variable"
    } else {
        Write-Host "To get your Supabase access token:"
        Write-Host "1. Go to: https://supabase.com/dashboard/account/tokens"
        Write-Host "2. Create a new token (or use existing)"
        Write-Host "3. Copy the token"
        Write-Host ""
        Write-Host "Enter your access token (or press Enter to try without):"
        $AccessToken = Read-Host
    }
}

# Set access token if provided
if (-not [string]::IsNullOrEmpty($AccessToken)) {
    $env:SUPABASE_ACCESS_TOKEN = $AccessToken
    Write-Host "✓ Access token set"
    Write-Host ""
}

# Ensure backups directory exists
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

Write-Host "Creating backup..."
Write-Host "Backup file: $backupFile"
Write-Host ""

# Create backup
supabase db dump --linked -f $backupFile 2>&1 | Tee-Object -Variable output

Start-Sleep -Seconds 3

# Check result
if (Test-Path $backupFile) {
    $file = Get-Item $backupFile
    $content = Get-Content $backupFile -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "ERROR|FATAL|Access token|error" -or $file.Length -lt 1000) {
        Write-Host ""
        Write-Host "✗ Backup failed. Error output:"
        Write-Host ""
        Get-Content $backupFile | Select-Object -First 20
        Write-Host ""
        Write-Host "Full output:"
        $output | Select-Object -Last 10
        Write-Host ""
        Remove-Item $backupFile -ErrorAction SilentlyContinue
        exit 1
    }
    
    Write-Host ""
    Write-Host "✓✓✓ SUCCESS! Backup created successfully!"
    Write-Host ""
    Write-Host "File Details:"
    Write-Host "  Name: $($file.Name)"
    Write-Host "  Size: $([math]::Round($file.Length/1KB, 2)) KB"
    Write-Host "  Created: $($file.LastWriteTime)"
    Write-Host "  Location: $($file.FullName)"
    Write-Host ""
    Write-Host "Your database backup is complete!"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Backup file was not created."
    Write-Host ""
    Write-Host "Error output:"
    $output | Select-Object -Last 10
    Write-Host ""
    Write-Host "Please ensure:"
    Write-Host "1. Docker Desktop is running"
    Write-Host "2. You have a valid Supabase access token"
    Write-Host "3. You have internet connection"
    Write-Host ""
    exit 1
}

