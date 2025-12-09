# PowerShell script to apply remaining menu option fixes for product owners
# This script makes targeted edits to UsersManagementScreen.tsx

$filePath = "src\screens\UsersManagementScreen.tsx"
$content = Get-Content $filePath -Raw

Write-Host "Applying fixes to UsersManagementScreen.tsx..." -ForegroundColor Cyan

# Fix 1: Mobile menu - Edit User (around line 2739)
$pattern1 = '(?s)(\{/\* Edit User - only for system admins - moved to bottom \*/\}\s+)\{viewMode === ''system-admin'' && \('
$replacement1 = '{/* Edit User - available for system admins and product owners (for users in their products) */}
                              {(viewMode === ''system-admin'' || 
                                (viewMode === ''session-admin'' && (
                                  (user.adminInSessions && user.adminInSessions.some(session => userAdminSessions.includes(session.id))) ||
                                  (user.stakeholderInSessions && user.stakeholderInSessions.some(session => userAdminSessions.includes(session.id)))
                                ))) && ('

if ($content -match $pattern1) {
    $content = $content -replace $pattern1, $replacement1
    Write-Host "✓ Fixed mobile Edit User menu" -ForegroundColor Green
} else {
    Write-Host "✗ Mobile Edit User pattern not found (may already be fixed)" -ForegroundColor Yellow
}

# Fix 2: Desktop menu - Remove All Roles (around line 3738)
$pattern2 = '(?s)\{\s*\(user\.roles\.isSystemAdmin \|\| user\.roles\.sessionAdminCount > 0 \|\| user\.roles\.stakeholderSessionCount > 0\) && \(\s*<button\s+onClick=\{\(\) => handleRemoveAllRoles\(user\.id, user\.name\)\}\s+className="w-full px-4 py-2 text-left flex items-center hover:bg-gray-50 text-gray-700 border-t border-gray-200"\s+>\s+<UserX className="h-4 w-4 mr-3" />\s+<div>\s+<div className="font-medium">Remove All Roles</div>\s+<div className="text-xs text-gray-500">Remove from all sessions</div>\s+</div>\s+</button>\s+\)\}'
$replacement2 = '{/* Remove all roles option - Available for system admins and product owners */}
                                  {((viewMode === ''system-admin'' && (user.roles.isSystemAdmin || user.roles.sessionAdminCount > 0 || user.roles.stakeholderSessionCount > 0)) ||
                                    (viewMode === ''session-admin'' && (
                                      (user.adminInSessions && user.adminInSessions.some(session => userAdminSessions.includes(session.id))) ||
                                      (user.stakeholderInSessions && user.stakeholderInSessions.some(session => userAdminSessions.includes(session.id)))
                                    ))) && (
                                    <button
                                      onClick={() => handleRemoveAllRoles(user.id, user.name)}
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-gray-50 text-gray-700 border-t border-gray-200"
                                    >
                                      <UserX className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">Remove All Roles</div>
                                        <div className="text-xs text-gray-500">
                                          {viewMode === ''session-admin''
                                            ? ''Remove from all your sessions'' 
                                            : ''Remove from all sessions''}
                                        </div>
                                      </div>
                                    </button>
                                  )}'

if ($content -match $pattern2) {
    $content = $content -replace $pattern2, $replacement2
    Write-Host "✓ Fixed desktop Remove All Roles menu" -ForegroundColor Green
} else {
    Write-Host "✗ Desktop Remove All Roles pattern not found (may already be fixed)" -ForegroundColor Yellow
}

# Fix 3: Desktop menu - Edit User (around line 3761)
$pattern3 = '(?s)(\{/\* Edit User - only for system admins - moved to bottom \*/\}\s+)\{viewMode === ''system-admin'' && \('
$replacement3 = '{/* Edit User - available for system admins and product owners (for users in their products) */}
                                  {(viewMode === ''system-admin'' || 
                                    (viewMode === ''session-admin'' && (
                                      (user.adminInSessions && user.adminInSessions.some(session => userAdminSessions.includes(session.id))) ||
                                      (user.stakeholderInSessions && user.stakeholderInSessions.some(session => userAdminSessions.includes(session.id)))
                                    ))) && ('

if ($content -match $pattern3) {
    $content = $content -replace $pattern3, $replacement3
    Write-Host "✓ Fixed desktop Edit User menu" -ForegroundColor Green
} else {
    Write-Host "✗ Desktop Edit User pattern not found (may already be fixed)" -ForegroundColor Yellow
}

# Write the modified content back
Set-Content -Path $filePath -Value $content -NoNewline

Write-Host "`nAll fixes applied! Please verify the file is correct." -ForegroundColor Green

