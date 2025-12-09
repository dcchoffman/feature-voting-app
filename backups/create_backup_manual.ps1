# Database Backup Script - Manual Connection String Method
# This script uses a connection string you provide from Supabase Dashboard

param(
    [Parameter(Mandatory=$false)]
    [string]$ConnectionString = ""
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backups/database_backup_$timestamp.sql"

Write-Host "=========================================="
Write-Host "Database Backup - Manual Method"
Write-Host "=========================================="
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..."
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker is not running!"
    Write-Host "Please start Docker Desktop first."
    exit 1
}
Write-Host "✓ Docker is running"
Write-Host ""

# If no connection string provided, guide user to get it
if ([string]::IsNullOrEmpty($ConnectionString)) {
    Write-Host "To get your connection string:"
    Write-Host "1. Go to: https://supabase.com/dashboard/project/okdzllfpsvltjqryslnn/settings/database"
    Write-Host "2. Scroll to 'Connection string' section"
    Write-Host "3. Copy the 'URI' connection string"
    Write-Host "4. It should look like: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
    Write-Host ""
    Write-Host "Enter your connection string (or press Enter to use Supabase CLI method):"
    $ConnectionString = Read-Host
    
    if ([string]::IsNullOrEmpty($ConnectionString)) {
        Write-Host ""
        Write-Host "Using Supabase CLI method instead..."
        Write-Host "Make sure you've run: supabase login"
        Write-Host ""
        
        # Ensure backups directory exists
        if (-not (Test-Path "backups")) {
            New-Item -ItemType Directory -Path "backups" | Out-Null
        }
        
        Write-Host "Creating backup..."
        supabase db dump --linked -f $backupFile 2>&1
        
        if (Test-Path $backupFile) {
            $file = Get-Item $backupFile
            if ($file.Length -gt 1000) {
                Write-Host ""
                Write-Host "✓✓✓ SUCCESS! Backup created!"
                Write-Host ""
                Write-Host "File: $($file.Name)"
                Write-Host "Size: $([math]::Round($file.Length/1KB, 2)) KB"
                Write-Host "Location: $($file.FullName)"
                Write-Host ""
            } else {
                Write-Host ""
                Write-Host "⚠ Backup file is small. Checking contents..."
                Get-Content $backupFile | Select-Object -First 10
            }
        } else {
            Write-Host ""
            Write-Host "✗ Backup failed. Make sure you've run: supabase login"
        }
        exit
    }
}

# Ensure backups directory exists
if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

Write-Host "Creating backup using connection string..."
Write-Host ""

# Use Supabase CLI with connection string
supabase db dump --db-url $ConnectionString -f $backupFile 2>&1 | Tee-Object -Variable output

Start-Sleep -Seconds 3

if (Test-Path $backupFile) {
    $file = Get-Item $backupFile
    
    # Check for errors in the file
    $content = Get-Content $backupFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "ERROR" -or $content -match "FATAL" -or $content -match "error") {
        Write-Host ""
        Write-Host "✗ Backup failed with errors:"
        Write-Host ""
        Get-Content $backupFile | Select-Object -First 20
        Write-Host ""
        Remove-Item $backupFile -ErrorAction SilentlyContinue
        exit 1
    }
    
    if ($file.Length -gt 1000) {
        Write-Host ""
        Write-Host "✓✓✓ SUCCESS! Backup created!"
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
        Write-Host "⚠ Backup file created but appears small ($($file.Length) bytes)."
        Write-Host "Checking contents..."
        Write-Host ""
        Get-Content $backupFile | Select-Object -First 10
    }
} else {
    Write-Host ""
    Write-Host "✗ Backup file was not created."
    Write-Host ""
    Write-Host "Error output:"
    $output
    Write-Host ""
    Write-Host "Please check:"
    Write-Host "1. Connection string is correct"
    Write-Host "2. Docker Desktop is running"
    Write-Host "3. You have internet connection"
    Write-Host ""
}

