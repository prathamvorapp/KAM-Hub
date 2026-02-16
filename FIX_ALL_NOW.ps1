# PowerShell script to fix ALL records at once
# Usage: .\FIX_ALL_NOW.ps1

Write-Host "Fixing ALL churn records..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Uri "http://localhost:3022/api/admin/fix-churn-statuses" `
    -Method POST `
    -ContentType "application/json"

Write-Host "`nResponse:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "Total Records: $($response.summary.total_records)"
Write-Host "Fixed: $($response.summary.fixed)" -ForegroundColor Green
Write-Host "Already Correct: $($response.summary.already_correct)" -ForegroundColor Blue
Write-Host "Errors: $($response.summary.errors)" -ForegroundColor Red
