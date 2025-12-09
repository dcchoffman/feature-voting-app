@echo off
echo ==========================================
echo Creating Database Backup
echo ==========================================
echo.
echo Step 1: Authenticating with Supabase...
echo (This will open your browser)
echo.
supabase login
if %ERRORLEVEL% NEQ 0 (
    echo Authentication failed. Please try again.
    pause
    exit /b 1
)
echo.
echo Step 2: Creating backup...
echo.
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
supabase db dump --linked -f "backups/database_backup_%TIMESTAMP%.sql"
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Backup created in backups/ directory
) else (
    echo.
    echo Backup failed. Check the error messages above.
)
pause
