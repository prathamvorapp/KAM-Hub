# Health Check Fix - Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [ ] Review changes in `lib/services/healthCheckService.ts`
- [ ] Review changes in `app/api/data/health-checks/clear-cache/route.ts`
- [ ] Verify no TypeScript errors: `npm run type-check`
- [ ] Verify no linting errors: `npm run lint`

### 2. Testing (Development)
- [ ] Test with Agent role
- [ ] Test with Team Lead role
- [ ] Test with Admin role
- [ ] Verify cache clearing works
- [ ] Test assessment submission
- [ ] Check browser console for errors

### 3. Database Preparation
- [ ] Backup current data (optional but recommended)
  ```sql
  COPY (SELECT * FROM health_checks WHERE assessment_month = '2026-02') 
  TO '/tmp/health_checks_backup.csv' CSV HEADER;
  ```
- [ ] Run diagnostic queries from `diagnose-health-check-issue.sql`
- [ ] Fix any data integrity issues using `fix-health-check-data-integrity.sql`
- [ ] Verify indexes exist (queries in fix script)

### 4. Documentation Review
- [ ] Read `HEALTH_CHECK_COMPLETE_FIX.md`
- [ ] Review `QUICK_FIX_GUIDE.md`
- [ ] Understand `HEALTH_CHECK_FIX_DIAGRAM.md`
- [ ] Prepare `test-health-check-fix.md` for QA team

## Deployment Steps

### Step 1: Build
```bash
# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Check for build errors
echo $?  # Should output 0
```

### Step 2: Deploy
```bash
# Deploy to your environment
# (Adjust based on your deployment process)

# Example for Vercel:
vercel --prod

# Example for custom server:
pm2 restart app-name

# Example for Docker:
docker-compose up -d --build
```

### Step 3: Verify Deployment
- [ ] Application starts without errors
- [ ] Health check endpoint responds: `/api/auth/health`
- [ ] Can access login page
- [ ] Can log in successfully

## Post-Deployment

### Immediate Verification (5 minutes)

#### 1. Clear All Caches
- [ ] Navigate to Health Check-ups page
- [ ] Click "Clear Cache" button
- [ ] Verify success message appears
- [ ] Refresh the page

#### 2. Check Assessment Tab
- [ ] Open Assessment tab
- [ ] Verify progress card shows correct counts
  - Total Brands: [Expected number]
  - Completed: [Expected number]
  - Remaining: [Expected number]
- [ ] Verify brands are displayed in grid
- [ ] Count matches "Remaining" number

#### 3. Test Assessment Flow
- [ ] Click on a brand
- [ ] Assessment modal opens
- [ ] Fill in the form
- [ ] Submit assessment
- [ ] Brand disappears from list
- [ ] Counts update correctly
- [ ] No errors in console

#### 4. Check History Tab
- [ ] Switch to History tab
- [ ] Verify new assessment appears
- [ ] Search functionality works
- [ ] All details are correct

#### 5. Check Statistics Tab
- [ ] Switch to Statistics tab
- [ ] Verify counts are accurate
- [ ] Charts/graphs display correctly
- [ ] No errors in console

### Extended Verification (30 minutes)

#### 1. Multi-User Testing
- [ ] Test with different agent accounts
- [ ] Verify each agent sees only their brands
- [ ] Test with team lead account
- [ ] Verify team lead sees team brands
- [ ] Test with admin account
- [ ] Verify admin sees all brands

#### 2. Edge Cases
- [ ] Test with agent who has 0 brands
- [ ] Test with agent who assessed all brands
- [ ] Test with brand names containing special characters
- [ ] Test with very long brand names
- [ ] Test month selector (previous/next months)

#### 3. Performance Testing
- [ ] Check page load time
- [ ] Verify cache is working (check console logs)
- [ ] Test with large dataset (50+ brands)
- [ ] Monitor API response times

#### 4. Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on mobile devices

### Database Verification

#### 1. Check Data Integrity
```sql
-- Verify no duplicate assessments
SELECT brand_name, kam_email, assessment_month, COUNT(*) as count
FROM health_checks
WHERE assessment_month = '2026-02'
GROUP BY brand_name, kam_email, assessment_month
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Verify all assessments have valid users
SELECT COUNT(*) 
FROM health_checks hc
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.email = hc.kam_email
);
-- Should return 0

-- Verify brand counts match
SELECT 
  up.email,
  COUNT(DISTINCT md.brand_name) as total_brands,
  COUNT(DISTINCT hc.brand_name) as assessed_brands,
  COUNT(DISTINCT md.brand_name) - COUNT(DISTINCT hc.brand_name) as pending_brands
FROM user_profiles up
LEFT JOIN master_data md ON md.kam_email_id = up.email
LEFT JOIN health_checks hc ON hc.kam_email = up.email 
  AND hc.assessment_month = '2026-02'
WHERE up.role = 'Agent'
GROUP BY up.email
ORDER BY pending_brands DESC
LIMIT 10;
-- Verify counts match UI
```

#### 2. Monitor Logs
```bash
# Check application logs for errors
tail -f /var/log/app.log | grep -i error

# Check for health check related logs
tail -f /var/log/app.log | grep "getBrandsForAssessment"

# Monitor database queries
# (Adjust based on your database logging setup)
```

## Rollback Plan

### If Critical Issues Occur

#### 1. Immediate Rollback
```bash
# Revert to previous version
git revert HEAD
npm run build

# Redeploy
# (Use your deployment process)

# Clear caches
# (Use admin panel or API)
```

#### 2. Notify Users
- [ ] Send notification about temporary issue
- [ ] Provide ETA for fix
- [ ] Document the issue

#### 3. Investigate
- [ ] Collect error logs
- [ ] Review browser console errors
- [ ] Check database for issues
- [ ] Run diagnostic queries

## Monitoring (First 24 Hours)

### Metrics to Watch
- [ ] Error rate (should be 0%)
- [ ] API response times (should be < 500ms)
- [ ] Cache hit rate (should be > 80%)
- [ ] User complaints (should be 0)
- [ ] Assessment submission rate (should increase)

### Alerts to Set Up
- [ ] Alert on API errors
- [ ] Alert on slow queries (> 1s)
- [ ] Alert on cache failures
- [ ] Alert on authentication failures

## Success Criteria

### Must Have (Critical)
- ✅ All agents can see their pending brands
- ✅ Brand counts are accurate
- ✅ Assessments can be submitted
- ✅ No errors in console
- ✅ No database errors

### Should Have (Important)
- ✅ Cache is working correctly
- ✅ Page loads in < 2 seconds
- ✅ All tabs work correctly
- ✅ Search functionality works
- ✅ Month selector works

### Nice to Have (Optional)
- ✅ Smooth animations
- ✅ Responsive on mobile
- ✅ Accessibility features work
- ✅ Export functionality works

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Deployment successful

**Signed:** _________________ **Date:** _________

### QA Team
- [ ] All test cases passed
- [ ] Edge cases verified
- [ ] Performance acceptable
- [ ] No critical bugs

**Signed:** _________________ **Date:** _________

### Product Owner
- [ ] Feature works as expected
- [ ] User experience is good
- [ ] Ready for production
- [ ] Stakeholders notified

**Signed:** _________________ **Date:** _________

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify metrics
- [ ] Document any issues

### Short-term (Week 1)
- [ ] Collect user feedback
- [ ] Analyze usage patterns
- [ ] Optimize if needed
- [ ] Update documentation

### Long-term (Month 1)
- [ ] Review performance metrics
- [ ] Plan improvements
- [ ] Update tests
- [ ] Knowledge transfer

## Contact Information

### Support Escalation
- **Level 1:** [Support Team Email]
- **Level 2:** [Development Team Email]
- **Level 3:** [Tech Lead Email]

### Emergency Contacts
- **On-Call Developer:** [Phone Number]
- **Database Admin:** [Phone Number]
- **DevOps:** [Phone Number]

## Notes

### Known Issues
- None at deployment time

### Future Improvements
- Add real-time updates using Supabase Realtime
- Implement bulk assessment feature
- Add export to CSV functionality
- Improve mobile responsiveness

### Lessons Learned
- Document after deployment
- Include what went well
- Include what could be improved
- Share with team

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Version:** 1.0.0
**Status:** ⬜ Pending / ⬜ In Progress / ⬜ Complete / ⬜ Rolled Back
