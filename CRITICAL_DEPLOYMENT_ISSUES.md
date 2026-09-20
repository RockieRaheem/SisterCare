# 🚨 Critical Deployment Issues - Action Required

## Issue 1: Old Build Still Deployed ❌

**Symptom:** Browser console still shows "Content-Security-Policy-Report-Only"

**Root Cause:** The code changes we made are **not deployed** yet. The production site is still running the old version.

**IMMEDIATE ACTION REQUIRED:**

### Step 1: Verify Local Changes Are Committed
```bash
cd c:\Users\Raheem\Desktop\SisterCare
git status
git add .
git commit -m "fix: Enable CSP enforcement, make safety duty optional for pilot"
git push origin main
```

### Step 2: Force Vercel to Redeploy
If Vercel didn't auto-deploy:
1. Go to Vercel Dashboard → sister-care project
2. Click "Deployments" tab
3. Find the latest commit
4. Click "Redeploy" → "Redeploy with existing build cache cleared"

OR trigger new deployment:
```bash
# Make a trivial change to force rebuild
echo "# Deployment trigger" >> README.md
git add README.md
git commit -m "chore: trigger deployment"
git push
```

---

## Issue 2: Admin Doctors API Returning 503 ❌

**Error:** `GET /api/admin/doctors 503 (Service Unavailable)`

**Possible Causes:**

### Cause A: Missing Environment Variables in Vercel ⚠️

**Check these variables are set in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
SUPABASE_SECRET_KEY=your_secret  # This is CRITICAL
```

**How to check:**
1. Vercel Dashboard → sister-care → Settings → Environment Variables
2. Verify ALL variables from `.env.local` are in Vercel
3. Especially verify `SUPABASE_SECRET_KEY` exists

**If missing:**
1. Add the missing variables
2. Redeploy the application

### Cause B: Supabase Service Role Key Issue ⚠️

The API needs admin access to create doctors. Check:

```typescript
// In src/app/api/admin/doctors/route.ts
// Line causing 503:
const { data, error } = await db
  .from("doctors")
  .select(...)
```

**This fails if:**
- `SUPABASE_SECRET_KEY` is not set in Vercel
- The secret key doesn't have service_role permissions
- Database connection failed

**Fix:**
1. Get your Supabase service role key:
   - Go to Supabase Dashboard
   - Project Settings → API
   - Copy "service_role" key (NOT anon key)
2. Add to Vercel as `SUPABASE_SECRET_KEY`
3. Redeploy

### Cause C: Database Tables Missing ⚠️

The `doctors` table might not exist.

**Verify in Supabase SQL Editor:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'doctors'
);
```

**If false, run migrations:**
```sql
-- Run these in order:
-- supabase/migrations/20260824_0033_add_doctor_role.sql
-- supabase/migrations/20260824_0034_doctor_care.sql
-- supabase/migrations/20260824_0036_doctor_verification_evidence.sql
-- ... etc
```

---

## Diagnostic Steps

### 1. Check Deployed Version
```bash
# Visit your deployed site and check console
# Old version will show: "Content-Security-Policy-Report-Only"
# New version will show: "Content-Security-Policy" (or no CSP warnings)
```

### 2. Check Vercel Deployment Logs
1. Vercel Dashboard → Deployments → Latest deployment
2. Click "View Function Logs"
3. Look for errors in `/api/admin/doctors`
4. Common errors:
   - "SUPABASE_SECRET_KEY is not defined"
   - "relation 'doctors' does not exist"
   - "permission denied"

### 3. Test Health Endpoint
```bash
curl https://sister-care.vercel.app/api/health
```

**Expected response:**
```json
{
  "status": "ready",
  "checks": {
    "security": true,
    "database": true
  }
}
```

**If database: false:**
- Migrations not run
- RLS policies incorrect
- Service role key invalid

### 4. Check Supabase Connection
```bash
# Try accessing Supabase directly from Vercel
curl https://sister-care.vercel.app/api/health
```

Look for:
- "Supabase is not configured"
- "Authentication verification unavailable"

---

## Quick Fix Priority Order

### Priority 1: Deploy New Code ⚡
**This fixes CSP issue**
```bash
git push
# Wait for Vercel auto-deploy
# Or manually redeploy in Vercel dashboard
```

### Priority 2: Fix Environment Variables ⚡
**This fixes 503 errors**

Required in Vercel (check Settings → Environment Variables):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
SUPABASE_SECRET_KEY=eyJhbG...  ← MUST be service_role key
CRON_SECRET=minimum-32-character-random-string
TELEMETRY_HASH_SALT=minimum-32-character-random-string
GROQ_API_KEY=gsk_xxx (or GEMINI_API_KEY)
DAILY_API_KEY=your-daily-key
DAILY_DOMAIN=your-name.daily.co
ENFORCE_SAFETY_DUTY=false  ← ADD THIS
```

After adding/changing:
1. Click "Save"
2. Redeploy application

### Priority 3: Verify Database Schema ⚡
**Ensures doctors table exists**

Run in Supabase SQL Editor:
```sql
-- Check if doctors table exists
SELECT COUNT(*) FROM doctors;

-- If error "relation does not exist", run all migrations:
-- See supabase/migrations/ folder
-- Run files 0033 through 0041 in order
```

---

## Common Error Messages and Solutions

### Error: "report-only policy"
**Solution:** New code not deployed. Push and redeploy.

### Error: "503 Service Unavailable"
**Solution:** Environment variable missing or database connection failed.

### Error: "SUPABASE_SECRET_KEY is not defined"
**Solution:** Add secret key to Vercel environment variables.

### Error: "relation 'doctors' does not exist"
**Solution:** Run database migrations in Supabase.

### Error: "permission denied for table doctors"
**Solution:** Check RLS policies or use service_role key.

---

## Verification Checklist

After fixes, verify:

- [ ] Browser console shows "Content-Security-Policy" (not report-only)
- [ ] `/api/health` returns 200 OK
- [ ] `/api/admin/doctors` loads without 503
- [ ] Can login as admin
- [ ] Can access `/admin/doctors` page
- [ ] Doctor form loads properly

---

## Emergency Rollback

If production is broken:

1. **Immediate:** Set `PILOT_PAUSED=true` in Vercel
2. **Quick:** Revert to previous deployment in Vercel dashboard
3. **Investigate:** Check function logs for errors
4. **Fix:** Address root cause before redeploying

---

## Next Steps

1. ✅ Commit and push code changes
2. ✅ Verify Vercel auto-deployed (or manually trigger)
3. ✅ Check all environment variables in Vercel
4. ✅ Add `ENFORCE_SAFETY_DUTY=false` if missing
5. ✅ Verify `SUPABASE_SECRET_KEY` is service_role key
6. ✅ Run missing database migrations if needed
7. ✅ Test `/api/health` endpoint
8. ✅ Test `/api/admin/doctors` endpoint
9. ✅ Verify CSP enforcement in browser console

---

## Contact Points

**Check deployment status:**
- Vercel Dashboard → Deployments
- Look for "Ready" status (not "Building" or "Error")

**Check database status:**
- Supabase Dashboard → SQL Editor
- Run: `SELECT * FROM doctors LIMIT 1;`

**Check environment variables:**
- Vercel → Settings → Environment Variables
- Ensure ALL required variables are set

---

**Status:** Action required - Code changes not yet deployed to production
**Priority:** HIGH - Site is running old version with known issues
**Timeline:** Fix should take 5-10 minutes once environment is correct
