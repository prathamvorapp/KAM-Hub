#!/usr/bin/env pwsh
# Comprehensive Churn Records Fix Script
# This script fixes ALL churn records in the database at once

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  COMPREHENSIVE CHURN RECORDS FIX" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Fix records with completed reasons but wrong status" -ForegroundColor Yellow
Write-Host "  2. Fix records with 3+ call attempts but not marked completed" -ForegroundColor Yellow
Write-Host "  3. Fix records with inconsistent is_follow_up_active flags" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️  WARNING: This will update multiple records in the database!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "❌ Operation cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting fix process..." -ForegroundColor Green
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Please run 'npm install' first." -ForegroundColor Red
    exit 1
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local not found. Please create it with your database credentials." -ForegroundColor Red
    exit 1
}

# Run the TypeScript script using tsx
Write-Host "📦 Running fix script..." -ForegroundColor Cyan
npx tsx scripts/fix-all-churn-records-comprehensive.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ FIX COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Hard refresh your browser (Ctrl+Shift+R)" -ForegroundColor Yellow
    Write-Host "  2. Check the churn page to verify counts are correct" -ForegroundColor Yellow
    Write-Host "  3. The auto-fix will handle any new records going forward" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  ❌ FIX FAILED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above and try again." -ForegroundColor Red
    Write-Host ""
    exit 1
}
