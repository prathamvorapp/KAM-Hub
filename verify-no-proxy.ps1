# PowerShell verification script for Windows

Write-Host "🔍 Verifying Proxy/Middleware Removal..." -ForegroundColor Cyan
Write-Host ""

# Check for deleted files
Write-Host "1. Checking for deleted files..." -ForegroundColor Yellow
if (Test-Path "proxy.ts") {
    Write-Host "   ❌ proxy.ts still exists!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ✅ proxy.ts deleted" -ForegroundColor Green
}

if (Test-Path "src/middleware.ts") {
    Write-Host "   ❌ src/middleware.ts still exists!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ✅ src/middleware.ts deleted" -ForegroundColor Green
}

Write-Host ""

# Check for new files
Write-Host "2. Checking for new files..." -ForegroundColor Yellow
if (Test-Path "components/RouteGuard.tsx") {
    Write-Host "   ✅ components/RouteGuard.tsx created" -ForegroundColor Green
} else {
    Write-Host "   ❌ components/RouteGuard.tsx missing!" -ForegroundColor Red
    exit 1
}

if (Test-Path "NO_PROXY_NO_MIDDLEWARE.md") {
    Write-Host "   ✅ NO_PROXY_NO_MIDDLEWARE.md created" -ForegroundColor Green
} else {
    Write-Host "   ❌ NO_PROXY_NO_MIDDLEWARE.md missing!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check for references in code
Write-Host "3. Checking for proxy/middleware references in code..." -ForegroundColor Yellow
$refs = Select-String -Path "*.ts","*.tsx","*.js","*.jsx" -Pattern "proxy\.ts|middleware\.ts" -Exclude "node_modules","*.md",".next" -Recurse -ErrorAction SilentlyContinue
if ($refs.Count -eq 0) {
    Write-Host "   ✅ No proxy/middleware file references found in code" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found $($refs.Count) references (check if they're just comments)" -ForegroundColor Yellow
}

Write-Host ""

# Try to build
Write-Host "4. Testing build..." -ForegroundColor Yellow
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All checks passed! Proxy and middleware successfully removed." -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run dev"
Write-Host "   2. Test login at http://localhost:3000"
Write-Host "   3. Verify authentication works"
Write-Host "   4. Check protected routes redirect properly"
