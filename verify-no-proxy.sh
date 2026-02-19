#!/bin/bash

echo "🔍 Verifying Proxy/Middleware Removal..."
echo ""

# Check for deleted files
echo "1. Checking for deleted files..."
if [ -f "proxy.ts" ]; then
    echo "   ❌ proxy.ts still exists!"
    exit 1
else
    echo "   ✅ proxy.ts deleted"
fi

if [ -f "src/middleware.ts" ]; then
    echo "   ❌ src/middleware.ts still exists!"
    exit 1
else
    echo "   ✅ src/middleware.ts deleted"
fi

echo ""

# Check for new files
echo "2. Checking for new files..."
if [ -f "components/RouteGuard.tsx" ]; then
    echo "   ✅ components/RouteGuard.tsx created"
else
    echo "   ❌ components/RouteGuard.tsx missing!"
    exit 1
fi

if [ -f "NO_PROXY_NO_MIDDLEWARE.md" ]; then
    echo "   ✅ NO_PROXY_NO_MIDDLEWARE.md created"
else
    echo "   ❌ NO_PROXY_NO_MIDDLEWARE.md missing!"
    exit 1
fi

echo ""

# Check for references in code (excluding node_modules and docs)
echo "3. Checking for proxy/middleware references in code..."
PROXY_REFS=$(grep -r "proxy\.ts\|middleware\.ts" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | wc -l)

if [ "$PROXY_REFS" -eq 0 ]; then
    echo "   ✅ No proxy/middleware file references found in code"
else
    echo "   ⚠️  Found $PROXY_REFS references (check if they're just comments)"
fi

echo ""

# Try to build
echo "4. Testing build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ All checks passed! Proxy and middleware successfully removed."
echo ""
echo "📝 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Test login at http://localhost:3000"
echo "   3. Verify authentication works"
echo "   4. Check protected routes redirect properly"
