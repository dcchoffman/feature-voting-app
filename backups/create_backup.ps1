# Database Backup Script for Supabase
# This script creates a backup of your Supabase database

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "database_backup_$timestamp.sql"

Write-Host "Creating database backup..."
Write-Host "Backup file: $backupFile"
Write-Host ""

# Method 1: Using Supabase CLI (requires Docker Desktop to be running)
Write-Host "Attempting backup using Supabase CLI..."
try {
    supabase db dump --linked -f $backupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backup created successfully: $backupFile"
        exit 0
    }
} catch {
    Write-Host "✗ Supabase CLI method failed (Docker may not be running)"
}

# Method 2: Using pg_dump directly (requires PostgreSQL client tools)
Write-Host ""
Write-Host "Attempting backup using pg_dump..."
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    $env:PGPASSWORD = "OwfRnfvtCcgfKMCrgKJQjeawgWHtSSYW"
    pg_dump -h aws-1-us-east-2.pooler.supabase.com -p 5432 -U "cli_login_postgres.okdzllfpsvltjqryslnn" -d postgres -F p -f $backupFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backup created successfully: $backupFile"
        exit 0
    }
} else {
    Write-Host "✗ pg_dump not found"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "Backup failed. Please use one of these methods:"
Write-Host ""
Write-Host "Option 1: Start Docker Desktop and run this script again"
Write-Host "Option 2: Use Supabase Dashboard:"
Write-Host "  1. Go to https://supabase.com/dashboard/project/okdzllfpsvltjqryslnn"
Write-Host "  2. Navigate to Database > Backups"
Write-Host "  3. Click 'Create Backup'"
Write-Host ""
Write-Host "Option 3: Install PostgreSQL client tools and run this script again"
Write-Host "=========================================="

