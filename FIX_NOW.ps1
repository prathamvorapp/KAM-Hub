# PowerShell script to fix a single record
# Usage: .\FIX_NOW.ps1 158460

param(
    [Parameter(Mandatory=$true)]
    [string]$RID
)

$body = @{
    rid = $RID
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3022/api/admin/fix-single-record" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10
