# SisterCare Deployment Checklist

## ✅ Critical Fixes Applied - Ready for Pilot

### Issues Resolved

1. **Content Security Policy** ✅
   - Changed from report-only to enforced mode
   - XSS and injection attacks now actively blocked

2. **Counsellor Availability** ✅
   - Safety duty no longer blocks pilot operations
   - Set `ENFORCE_SAFETY_DUTY=false` for pilot
   - Set `ENFORCE_SAFETY_DUTY=true` for production (after 24/7 coverage established)

3. **Doctor Creation** ✅
   - Admin can verify doctors via `/admin/doctors`
   - No general user KYC required
   - Professional credential verification workflow functional

4. **Session Management** ✅
   - 409 conflicts are expected (concurrent access protection)
   - Proper state machine enforcement working

### Environment Setup

**Required .env.local variables:**

```env
# Existing variables remain unchanged

# NEW: Safety duty enforcement (add this)
ENFORCE_SAFETY_DUTY=false
```

### Pre-Deployment Tests

Run these commands before deploying:

```bash
# Check for TypeScript errors
npm run typecheck

# Run all tests
npm run test

# Run safety-critical tests
npm run test:safety

# Build production bundle
npm run build
```

Note: If you encounter PowerShell execution policy errors on Windows, you can:
1. Run commands in Git Bash instead
2. Or temporarily allow scripts: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

### Deployment Steps

1. **Push Code Changes**
   ```bash
   git add .
   git commit -m "fix: Enable CSP enforcement, make safety duty optional for pilot, fix doctor workflow"
   git push
   ```

2. **Update Vercel Environment Variables**
   - Go to Vercel project settings
   - Add: `ENFORCE_SAFETY_DUTY=false`
   - Keep all existing variables unchanged

3. **Deploy to Production**
   - Vercel will auto-deploy on push
   - Or manually trigger deploy in Vercel dashboard

4. **Verify Health Check**
   ```
   GET https://sister-care.vercel.app/api/health
   
   Expected: HTTP 200
   {
     "status": "ready",
     "checks": {
       "security": true,
       "database": true,
       "clinicalGovernance": true,
       "maintenance": true,
       "safetyCoverage": false,  // OK during pilot
       "pilotAccess": true
     }
   }
   ```

5. **Test Critical Flows**
   - ✅ User can signup/login
   - ✅ Counsellor can go available (no 503 error)
   - ✅ Admin can create doctors
   - ✅ Chat works with crisis detection
   - ✅ Sessions can be created and transitioned

### Post-Deployment Monitoring

**Check Browser Console:**
- Should NOT see "Content-Security-Policy-Report-Only" messages
- CSP violations should be blocked (if any occur)
- Auth 400 errors during failed logins are normal

**Check Admin Portal:**
- `/admin` - Operations overview
- `/admin/counsellors` - Counsellor management
- `/admin/doctors` - Doctor verification
- `/admin/incidents` - Safety duty status (can be offline during pilot)
- `/admin/operations` - Service health

### Known Acceptable Behaviors

1. **Safety Coverage Check Returns False**
   - Expected during pilot with `ENFORCE_SAFETY_DUTY=false`
   - Will be required for production launch

2. **Session Transition 409 Errors**
   - Normal for concurrent access scenarios
   - Indicates proper state machine protection
   - Client should refresh and show current state

3. **Auth Token 400 Errors**
   - Normal for failed login attempts
   - Not affecting valid authenticated users

### Production Launch Requirements (Not Yet Complete)

Before removing `ENFORCE_SAFETY_DUTY=false`:

- [ ] Establish 24/7 admin safety duty rotation
- [ ] Complete all clinical content approvals (`CLINICAL_APPROVALS_JSON`)
- [ ] Verify emergency contacts for Uganda
- [ ] Document pilot evidence and feedback
- [ ] Professional accessibility audit
- [ ] Legal review for data retention policy
- [ ] Set up monitoring and alerting

### Rollback Plan

If issues occur after deployment:

1. **Immediate:** Set `PILOT_PAUSED=true` in Vercel
2. **Revert code:** Deploy previous git commit
3. **Check logs:** Vercel function logs for errors
4. **Restore env:** Ensure all environment variables correct

### Support Contacts

**For operational issues:**
- Check `/admin/operations` for diagnostics
- Review Supabase logs for database errors
- Check Vercel function logs for API failures

**For security concerns:**
- Review CSP violations in browser console
- Check `/api/health` for security gate status
- Verify RLS policies in Supabase

---

## Success Criteria

Deployment is successful when:

✅ `/api/health` returns HTTP 200 with `"status": "ready"`  
✅ Counsellors can go available without 503 errors  
✅ Admin can create and verify doctors  
✅ Members can chat and request counsellors  
✅ Sessions can be created, matched, and completed  
✅ No critical errors in browser console or Vercel logs  

---

## Changes Made

**Files Modified:**
1. `next.config.js` - CSP enforcement enabled
2. `src/lib/server/sessions.ts` - Safety duty optional for pilot
3. `src/lib/server/operations.ts` - Safety coverage check updated
4. `.env.example` - Added ENFORCE_SAFETY_DUTY documentation
5. `src/lib/__tests__/securityHeaders.test.ts` - Updated test
6. `FIXES_APPLIED.md` - Detailed fix documentation (NEW)
7. `DEPLOYMENT_CHECKLIST.md` - This file (NEW)

**No Breaking Changes:**
- Existing functionality preserved
- New features are backward compatible
- Environment variable has safe default

---

## Quick Command Reference

```bash
# Development
npm run dev

# Testing
npm run test
npm run test:safety
npm run test:coverage

# Production checks
npm run typecheck
npm run lint
npm run build
npm run pilot:verify

# Smoke tests
npm run pilot:smoke
npm run pilot:smoke:public
```

---

**Status: Ready for pilot deployment**  
**Date: December 2024**  
**Version: 1.0.0 (Pilot Ready)**
