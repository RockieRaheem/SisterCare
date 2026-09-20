# ✅ Deployment Checklist

## Pre-Deployment (Local)
- [x] CSP changed from report-only to enforced
- [x] Safety duty made optional via ENFORCE_SAFETY_DUTY
- [x] Code changes committed locally
- [ ] Code pushed to GitHub
  ```bash
  cd "C:\Users\Raheem\Desktop\SisterCare"
  git add .
  git commit -m "fix: CSP enforcement, optional safety duty, doctor workflow"
  git push origin main
  ```

## Database Migration (Supabase)
- [ ] Opened Supabase SQL Editor
- [ ] Copied `RUN_THIS_IN_SUPABASE.sql` contents
- [ ] Pasted into SQL Editor
- [ ] Clicked "Run" button
- [ ] Verified success messages at bottom
- [ ] Tested: `SELECT COUNT(*) FROM doctors;` returns 0 (not error)

## Environment Variables (Vercel)
- [ ] Checked `NEXT_PUBLIC_SUPABASE_URL` exists
- [ ] Checked `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exists
- [ ] Checked `SUPABASE_SECRET_KEY` exists (service_role key)
- [ ] Added `ENFORCE_SAFETY_DUTY=false`
- [ ] Clicked "Save"
- [ ] Redeployed application

## Deployment (Vercel)
- [ ] Vercel auto-deployed after push
- [ ] Deployment status shows "Ready" (not "Building" or "Error")
- [ ] Checked deployment URL matches production URL
- [ ] Waited 2-3 minutes for deployment to complete

## Post-Deployment Verification

### Test 1: CSP Enforcement
- [ ] Opened https://sister-care.vercel.app
- [ ] Opened browser DevTools (F12)
- [ ] Checked Console tab
- [ ] Confirmed: NO "Content-Security-Policy-Report-Only" messages
- [ ] Result: ✅ CSP enforced / ❌ Still report-only

### Test 2: API Health Check
- [ ] Visited https://sister-care.vercel.app/api/health
- [ ] Confirmed `"database": true`
- [ ] Confirmed `"status": "ready"`
- [ ] Result: ✅ Healthy / ❌ Issues found

### Test 3: Admin Doctors API
- [ ] Logged in as admin
- [ ] Visited https://sister-care.vercel.app/admin/doctors
- [ ] Page loaded without 503 errors
- [ ] Browser console shows NO errors
- [ ] Result: ✅ Working / ❌ Still 503

### Test 4: Doctor Creation Workflow
- [ ] Filled doctor verification form
- [ ] Submitted form
- [ ] Success message appeared
- [ ] Doctor appears in list
- [ ] Result: ✅ Working / ❌ Failed

### Test 5: Counsellor Availability
- [ ] Logged in as counsellor
- [ ] Tried to go "available"
- [ ] NO "safety duty" error
- [ ] Status changed to available
- [ ] Result: ✅ Working / ❌ Still blocked

## Issue Resolution

### If CSP Still Report-Only
- [ ] Verified code was pushed: `git log -1`
- [ ] Checked Vercel deployment time is recent
- [ ] Forced hard refresh: Ctrl+Shift+R
- [ ] Cleared browser cache
- [ ] Redeployed with cache cleared

### If API Returns 503
- [ ] Checked SUPABASE_SECRET_KEY in Vercel
- [ ] Verified it's service_role key (not anon)
- [ ] Checked Vercel function logs
- [ ] Verified doctors table exists in Supabase
- [ ] Redeployed after fixing env vars

### If Doctor Table Missing
- [ ] Re-ran `RUN_THIS_IN_SUPABASE.sql`
- [ ] Checked for SQL errors in Supabase
- [ ] Verified: `SELECT * FROM doctors LIMIT 1;` works

### If Permission Errors
- [ ] Ran grant permissions:
  ```sql
  GRANT ALL ON public.doctors TO service_role;
  GRANT ALL ON public.doctor_appointments TO service_role;
  GRANT ALL ON public.doctor_prescriptions TO service_role;
  GRANT ALL ON public.doctor_messages TO service_role;
  ```

## Success Criteria

All of these must be true:

- ✅ CSP header is "Content-Security-Policy" (not report-only)
- ✅ /api/health returns 200 with database: true
- ✅ /api/admin/doctors returns 200 (not 503)
- ✅ /admin/doctors page loads without errors
- ✅ Can create doctor from admin form
- ✅ Counsellors can go available without safety duty error
- ✅ No console errors on main pages

## Rollback Plan (If Needed)

If production is completely broken:

1. **Immediate:**
   - [ ] Set `PILOT_PAUSED=true` in Vercel env vars
   - [ ] Redeploy

2. **Quick:**
   - [ ] Vercel → Deployments → Previous deployment
   - [ ] Click three dots → "Promote to Production"

3. **Investigate:**
   - [ ] Check Vercel function logs
   - [ ] Check Supabase logs
   - [ ] Check browser console errors

## Monitoring (First 24 Hours)

- [ ] Monitor error rates in Vercel
- [ ] Check Supabase logs for unusual activity
- [ ] Test key user flows:
  - [ ] User signup/login
  - [ ] Counsellor availability
  - [ ] Doctor creation
  - [ ] Chat functionality
  - [ ] Session creation

## Documentation

- [ ] Updated `.env.example` with ENFORCE_SAFETY_DUTY
- [ ] Created deployment guides
- [ ] Committed all documentation
- [ ] Pushed to repository

---

## Timeline

- **Database Migration:** 5 minutes
- **Code Deployment:** 3-5 minutes (auto)
- **Environment Variables:** 3 minutes
- **Verification:** 5 minutes
- **Total:** ~15-20 minutes

---

## Current Status

**Date:** _____________
**Time:** _____________
**Deployed By:** _____________

**Checklist Progress:**
- Pre-Deployment: ___/4
- Database: ___/6
- Env Vars: ___/7
- Deployment: ___/4
- Verification: ___/15

**Overall Status:** 🔴 Not Started / 🟡 In Progress / 🟢 Complete

**Issues Encountered:**
- _____________________________________________
- _____________________________________________

**Resolution:**
- _____________________________________________
- _____________________________________________

---

## Sign-Off

**Technical Verification:** ☐ Passed  
**Functional Testing:** ☐ Passed  
**Production Ready:** ☐ Yes / ☐ No

**Approved By:** _____________
**Date/Time:** _____________

---

## Emergency Contacts

**Vercel Dashboard:** https://vercel.com/dashboard  
**Supabase Dashboard:** https://supabase.com/dashboard  
**GitHub Repository:** (your repo URL)

**Support Resources:**
- STEP_BY_STEP_FIX.md (detailed guide)
- RUN_THIS_IN_SUPABASE.sql (database migration)
- URGENT_FIX_GUIDE.md (troubleshooting)
- FIXES_APPLIED.md (technical details)
