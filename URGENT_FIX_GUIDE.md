# 🚨 URGENT: Step-by-Step Fix Guide

## Problem Summary
1. **CSP still report-only** → Old code not deployed
2. **Admin doctors API 503** → Database/auth issue

---

## Fix 1: Deploy New Code (5 minutes)

### Step 1: Commit Your Changes
```bash
cd "C:\Users\Raheem\Desktop\SisterCare"

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "fix: CSP enforcement, optional safety duty, doctor workflow fixes"

# Push to trigger Vercel deployment
git push origin main
```

### Step 2: Wait for Vercel to Deploy
1. Go to https://vercel.com/dashboard
2. Select your "sister-care" project
3. Click "Deployments" tab
4. Wait for "Building..." to become "Ready" (takes 2-3 minutes)
5. Check the deployment URL matches your production URL

### Step 3: Verify CSP Fixed
1. Open https://sister-care.vercel.app
2. Open browser DevTools (F12)
3. Check Console tab
4. **OLD:** "Content-Security-Policy-Report-Only"
5. **NEW:** No CSP report-only messages (or just "Content-Security-Policy")

---

## Fix 2: Fix Admin Doctors 503 Error

### Root Cause Analysis

The error occurs in `src/app/api/admin/doctors/route.ts` line 33:
```typescript
const { data, error } = await db.from("doctors").select(...)
if (error) {
  return NextResponse.json({ ... }, { status: 503 });
}
```

This 503 happens when:
- ❌ `SUPABASE_SECRET_KEY` not set in Vercel
- ❌ Supabase URL wrong or inaccessible
- ❌ `doctors` table doesn't exist
- ❌ Database permissions incorrect

### Check 1: Vercel Environment Variables

**Go to:** https://vercel.com/dashboard → sister-care → Settings → Environment Variables

**Required variables:**
```
NEXT_PUBLIC_SUPABASE_URL = https://rjrozftbnywjpwsraiya.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = eyJhbG... (your anon key)
SUPABASE_SECRET_KEY = eyJhbG... or sb_secret_... (CRITICAL!)
```

**How to get SUPABASE_SECRET_KEY:**
1. Go to https://supabase.com/dashboard
2. Select your project (rjrozftbnywjpwsraiya)
3. Settings → API
4. Copy **service_role key** (NOT the anon key!)
5. Paste into Vercel as `SUPABASE_SECRET_KEY`

**After adding/updating:**
1. Click "Save"
2. Go to Deployments tab
3. Click latest deployment → Three dots → "Redeploy"
4. Wait for deployment to complete

### Check 2: Database Table Exists

**Open Supabase SQL Editor:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in sidebar
4. Run this query:

```sql
-- Check if doctors table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'doctors'
ORDER BY ordinal_position;
```

**Expected Result:** Should show ~15 columns (id, professional_name, title, etc.)

**If EMPTY (table doesn't exist):**

You need to run migrations. Run these SQL files in order:

1. **First, check which migrations are already applied:**
```sql
SELECT * FROM _prisma_migrations 
ORDER BY finished_at DESC LIMIT 10;
```

2. **If doctors table is missing, run these migrations in Supabase SQL Editor:**

Open and run **IN THIS EXACT ORDER:**

- `supabase/migrations/20260824_0033_add_doctor_role.sql`
- `supabase/migrations/20260824_0034_doctor_care.sql`
- `supabase/migrations/20260824_0036_doctor_verification_evidence.sql`
- `supabase/migrations/20260824_0037_doctor_consultation_messaging.sql`
- `supabase/migrations/20260824_0038_medical_safety_incidents.sql`
- `supabase/migrations/20260824_0039_harden_doctor_operations.sql`
- `supabase/migrations/20260824_0040_void_doctor_prescriptions.sql`
- `supabase/migrations/20260919_0041_doctor_profile_photos.sql`

**HOW TO RUN:**
1. Open each .sql file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Check for success message
6. Move to next file

### Check 3: RLS Policies

If table exists but query still fails, check Row Level Security:

```sql
-- Check RLS policies on doctors table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'doctors';
```

**Expected:** Should show at least one policy for service_role

**If no policies exist, run:**
```sql
-- Grant service_role access to doctors table
GRANT ALL ON public.doctors TO service_role;
GRANT ALL ON public.doctor_appointments TO service_role;
GRANT ALL ON public.doctor_prescriptions TO service_role;
```

---

## Verification Steps

### Test 1: Check API Health
```
URL: https://sister-care.vercel.app/api/health
Method: GET
```

**Expected Response (200 OK):**
```json
{
  "status": "ready",
  "service": "sistercare",
  "checks": {
    "security": true,
    "database": true,
    "clinicalGovernance": true,
    "maintenance": true,
    "safetyCoverage": false,
    "pilotAccess": true
  }
}
```

**If database: false:**
- SUPABASE_SECRET_KEY not set or wrong
- Database connection failing
- Migrations not applied

### Test 2: Check Admin Doctors API
```
URL: https://sister-care.vercel.app/api/admin/doctors
Method: GET
Headers: Authorization: Bearer <your_token>
```

**How to get token:**
1. Login to sister-care.vercel.app
2. Open DevTools → Application tab → Session Storage
3. Find your Supabase auth token
4. Use it in Authorization header

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "doctors": []
  }
}
```

**If still 503:**
- Check Vercel function logs
- Check Supabase logs
- Verify SECRET_KEY is service_role

### Test 3: Try Creating a Doctor
1. Login as admin at https://sister-care.vercel.app/admin
2. Navigate to /admin/doctors
3. Fill the verification form
4. Submit

**Expected:** Success message, doctor appears in list  
**If error:** Check browser console and Vercel logs

---

## Common Errors and Solutions

### Error: "SUPABASE_SECRET_KEY is not defined"
**Solution:** Add SUPABASE_SECRET_KEY in Vercel env vars

### Error: "relation 'doctors' does not exist"
**Solution:** Run doctor migrations in Supabase SQL Editor

### Error: "permission denied for table doctors"
**Solution:** Grant service_role access in SQL Editor

### Error: "invalid JWT"
**Solution:** Check SECRET_KEY is the service_role key (starts with "eyJhbG...")

### Error: "503 Service Unavailable" (generic)
**Solution:** Check Vercel function logs for specific error message

---

## Quick Checklist

- [ ] Code committed and pushed to git
- [ ] Vercel shows "Ready" deployment status
- [ ] CSP no longer says "report-only" in browser console
- [ ] SUPABASE_SECRET_KEY set in Vercel (service_role key)
- [ ] Doctors table exists in Supabase
- [ ] /api/health returns 200 OK with database: true
- [ ] /api/admin/doctors returns 200 OK (not 503)
- [ ] Can access /admin/doctors page without errors
- [ ] ENFORCE_SAFETY_DUTY=false added to Vercel

---

## If Still Broken

### Get More Info:

**Vercel Function Logs:**
1. Vercel Dashboard → sister-care → Deployments
2. Click latest deployment
3. Click "Functions" tab
4. Click "api/admin/doctors"
5. Read error messages

**Supabase Logs:**
1. Supabase Dashboard → Logs
2. Look for failed queries
3. Check for permission errors

**Share this info:**
- Exact error message from Vercel logs
- Result of doctors table existence check
- SUPABASE_SECRET_KEY format (first 10 chars only, e.g., "eyJhbGciOi...")

---

## Timeline

- **Step 1 (Deploy code):** 5 minutes
- **Step 2 (Fix env vars):** 3 minutes
- **Step 3 (Run migrations):** 10 minutes (if needed)
- **Step 4 (Verify):** 5 minutes

**Total:** 15-25 minutes to complete fix

---

## Success Criteria

✅ No "report-only" in browser console  
✅ /api/health returns 200 OK  
✅ /api/admin/doctors returns 200 OK  
✅ Can create doctor from /admin/doctors page  
✅ Counsellors can go available  

---

**Priority:** CRITICAL  
**Status:** Waiting for deployment and environment configuration  
**Next Step:** Commit and push code, then check Vercel env vars
