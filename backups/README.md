# Database Backup Instructions

## ⚠️ Important Note
**Dashboard backups are not available on the free tier.** You must use one of the CLI methods below.

## Quick Backup Methods

### Method 1: Using Supabase CLI (Recommended - Requires Authentication)

**Step 1: Authenticate with Supabase**
```powershell
supabase login
```
This will open your browser. Sign in to Supabase when prompted.

**Step 2: Create the Backup**
```powershell
.\backups\create_backup_with_auth.ps1
```
OR manually:
```powershell
supabase db dump --linked -f "backups/database_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

**Requirements:**
- Docker Desktop must be running
- You must be authenticated with `supabase login`

### Method 2: Using Connection String (Alternative)

**Step 1: Get Connection String**
1. Go to: https://supabase.com/dashboard/project/okdzllfpsvltjqryslnn/settings/database
2. Scroll to "Connection string" section
3. Copy the "URI" connection string (starts with `postgresql://`)

**Step 2: Run Backup Script**
```powershell
.\backups\create_backup_manual.ps1
```
The script will prompt you for the connection string if not provided as a parameter.

**Requirements:**
- Docker Desktop must be running
- Valid database connection string from Supabase dashboard

### Method 3: Manual pg_dump (Advanced)

If you have PostgreSQL client tools installed:
```powershell
$env:PGPASSWORD = "your-database-password"
pg_dump -h aws-1-us-east-2.pooler.supabase.com -p 5432 -U "postgres.okdzllfpsvltjqryslnn" -d postgres > "backups/database_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

## Database Connection Details
- **Host:** aws-1-us-east-2.pooler.supabase.com
- **Port:** 5432 (or 6543 for connection pooler)
- **Database:** postgres
- **User:** postgres.okdzllfpsvltjqryslnn (or check your dashboard)
- **Password:** Get from Supabase Dashboard → Settings → Database → Connection String

## Backup File Location
All backups will be saved in the `backups/` directory with timestamped filenames like:
- `database_backup_20251204_090000.sql`

## Troubleshooting

**"Docker is not running"**
- Start Docker Desktop and wait for it to fully initialize
- Check system tray for Docker icon

**"Access token not provided"**
- Run `supabase login` first
- Or set `$env:SUPABASE_ACCESS_TOKEN = "your-token"`

**"Authentication error"**
- Verify your connection string is correct
- Make sure you're using the URI format from the dashboard
- Check that Docker Desktop is running

**"Connection failed"**
- Verify internet connection
- Check that the database host is accessible
- Ensure firewall isn't blocking the connection

