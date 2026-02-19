#!/bin/bash

# API Security Testing Script
# Tests authentication and authorization on API endpoints

BASE_URL="http://localhost:3022"
AGENT_EMAIL="jinal.chavda@petpooja.com"
AGENT_PASSWORD="Temp@1234"
TEAM_LEAD_EMAIL="shaikh.farhan@petpooja.com"
TEAM_LEAD_PASSWORD="Temp@1234"
ADMIN_EMAIL="pratham.vora@petpooja.com"
ADMIN_PASSWORD="Temp@1234"

echo "🔐 API Security Testing Script"
echo "================================"
echo ""

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Unauthenticated API Access
echo "Test 1: Unauthenticated API Access"
echo "-----------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/churn")
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - API returns 401 for unauthenticated request"
else
    echo -e "${RED}❌ FAIL${NC} - API returned $response (expected 401)"
fi
echo ""

# Test 2: Login as Agent
echo "Test 2: Login as Agent"
echo "----------------------"
agent_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AGENT_EMAIL\",\"password\":\"$AGENT_PASSWORD\"}" \
  -c agent_cookies.txt)

if echo "$agent_response" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ PASS${NC} - Agent login successful"
    agent_token=$(echo "$agent_response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}❌ FAIL${NC} - Agent login failed"
    echo "$agent_response"
fi
echo ""

# Test 3: Agent accessing own data
echo "Test 3: Agent Accessing Own Data"
echo "---------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/churn" \
  -b agent_cookies.txt)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Agent can access own data"
else
    echo -e "${RED}❌ FAIL${NC} - Agent cannot access own data (HTTP $response)"
fi
echo ""

# Test 4: Agent accessing admin endpoint
echo "Test 4: Agent Accessing Admin Endpoint"
echo "---------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/fix-churn-statuses" \
  -X POST \
  -b agent_cookies.txt)
if [ "$response" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Agent blocked from admin endpoint (403)"
elif [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠️  WARN${NC} - Returns 401 instead of 403 (acceptable)"
else
    echo -e "${RED}❌ FAIL${NC} - Agent can access admin endpoint (HTTP $response)"
fi
echo ""

# Test 5: Login as Team Lead
echo "Test 5: Login as Team Lead"
echo "--------------------------"
tl_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEAM_LEAD_EMAIL\",\"password\":\"$TEAM_LEAD_PASSWORD\"}" \
  -c tl_cookies.txt)

if echo "$tl_response" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ PASS${NC} - Team Lead login successful"
else
    echo -e "${RED}❌ FAIL${NC} - Team Lead login failed"
fi
echo ""

# Test 6: Team Lead accessing approvals
echo "Test 6: Team Lead Accessing Approvals"
echo "--------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/data/visits" \
  -b tl_cookies.txt)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Team Lead can access visits"
else
    echo -e "${RED}❌ FAIL${NC} - Team Lead cannot access visits (HTTP $response)"
fi
echo ""

# Test 7: Team Lead accessing admin endpoint
echo "Test 7: Team Lead Accessing Admin Endpoint"
echo "-------------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/fix-churn-statuses" \
  -X POST \
  -b tl_cookies.txt)
if [ "$response" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Team Lead blocked from admin endpoint"
elif [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠️  WARN${NC} - Returns 401 instead of 403 (acceptable)"
else
    echo -e "${RED}❌ FAIL${NC} - Team Lead can access admin endpoint (HTTP $response)"
fi
echo ""

# Test 8: Login as Admin
echo "Test 8: Login as Admin"
echo "----------------------"
admin_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  -c admin_cookies.txt)

if echo "$admin_response" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ PASS${NC} - Admin login successful"
else
    echo -e "${RED}❌ FAIL${NC} - Admin login failed"
fi
echo ""

# Test 9: Admin accessing admin endpoint
echo "Test 9: Admin Accessing Admin Endpoint"
echo "---------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/fix-churn-statuses" \
  -X POST \
  -b admin_cookies.txt)
if [ "$response" = "200" ] || [ "$response" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Admin can access admin endpoint"
else
    echo -e "${RED}❌ FAIL${NC} - Admin cannot access admin endpoint (HTTP $response)"
fi
echo ""

# Test 10: Session persistence
echo "Test 10: Session Persistence"
echo "-----------------------------"
sleep 2
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/churn" \
  -b agent_cookies.txt)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Session persists after 2 seconds"
else
    echo -e "${RED}❌ FAIL${NC} - Session expired (HTTP $response)"
fi
echo ""

# Cleanup
rm -f agent_cookies.txt tl_cookies.txt admin_cookies.txt

echo "================================"
echo "Testing Complete!"
echo ""
echo "⚠️  Note: This script tests basic security."
echo "   Manual testing is still required for:"
echo "   - Logout flow"
echo "   - Session timeout"
echo "   - CSRF protection"
echo "   - Data filtering by role"
echo ""
