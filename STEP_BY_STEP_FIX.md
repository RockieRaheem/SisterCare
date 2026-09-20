# 🎯 STEP-BY-STEP: Fix Doctors Table Missing Error

## The Problem
When you ran `SELECT COUNT(*) FROM doctors` in Supabase, you got:
```
ERROR: 42P01: relation "doctors" does not exist
```

This means the doctor tables were never created in your production database.

---

## The Solution (3 Steps)

### Step 1: Run SQL Migration in Supabase (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `rjrozftbnywjpwsraiya`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the SQL Migration**
   - Open the file: `RUN_THIS_IN_SUPABASE.sql` (I just created it)
   - Select ALL the text (Ctrl+A)
   - Copy it (Ctrl+C)

4. **Paste and Run**
   - Paste into the Supabase SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait 5-10 seconds

5. **Verify Success**
   - You should see at the bottom:
     ```
     doctors table exists | 0
     doctor_appointments table exists | 0
     doctor_prescriptions table exists | 0
     doctor_messages table exists | 0
     ```
   - The "0" count is CORRECT (tables are empty but exist)

6. **Test the fix**
   - Run this query:
     ```sql
     SELECT COUNT(*) FROM doctors;
     ```
   - Expected result: **0** (not an error!)

---

### Step 2: Deploy Your Code to Vercel (5 minutes)

Your code changes aren't deployed yet. The production site is still running the old version.

1. **Commit and Push**
   ```bash
   cd "C:\Users\Raheem\Desktop\SisterCare"
   git add .
   git commit -m "fix: Enable CSP enforcement, optional safety duty, doctor workflow"
   git push origin main
   ```

2. **Wait for Auto-Deploy**
   - Go to: https://vercel.com/dashboard
   - Click your "sister-care" project
   - Click "Deployments" tab
   - Wait for status to change from "Building..." to "Ready" (2-3 minutes)

3. **If Auto-Deploy Didn't Trigger**
   - Click the latest deployment
   - Click the three dots (•••) menu
   - Select "Redeploy"
   - Wait for completion

---

### Step 3: Add Environment Variables in Vercel (3 minutes)

1. **Go to Vercel Settings**
   - Vercel Dashboard → sister-care → Settings → Environment Variables

2. **Check Required Variables Exist**
   Look for these:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` ← **CRITICAL!**

3. **If SUPABASE_SECRET_KEY is Missing**
   - Go to Supabase Dashboard → Settings → API
   - Copy the **"service_role"** key (NOT the anon key)
   - Add it in Vercel as `SUPABASE_SECRET_KEY`
   - Click "Save"

4. **Add New Environment Variable**
   - Click "Add New"
   - Key: `ENFORCE_SAFETY_DUTY`
   - Value: `false`
   - Environment: Production, Preview, Development (all 3)
   - Click "Save"

5. **Redeploy After Adding Variables**
   - Go to Deployments tab
   - Click latest deployment → Three dots → "Redeploy"
   - Wait for completion

---

## Verification (2 minutes)

### Test 1: Check CSP is Enforced
1. Open https://sister-care.vercel.app
2. Press F12 (open DevTools)
3. Go to Console tab
4. Look for CSP messages

**Expected:** No "report-only" messages  
**If still seeing "report-only":** Code not deployed yet, wait longer

### Test 2: Check API Health
1. Open this URL in your browser:
   ```
   https://sister-care.vercel.app/api/health
   ```

2. **Expected Response:**
   ```json
   {
     "status": "ready",
     "checks": {
       "database": true,
       "security": true
     }
   }
   ```

**If database: false:** SUPABASE_SECRET_KEY not set or wrong

### Test 3: Check Admin Doctors API
1. Login to sister-care.vercel.app as admin
2. Go to: https://sister-care.vercel.app/admin/doctors
3. The page should load WITHOUT errors

**Expected:** Empty doctor list (no "503" errors)  
**If still 503:** Check Vercel function logs for details

### Test 4: Try Creating a Doctor
1. On /admin/doctors page, fill the form:
   - Email: (an existing user email)
   - Professional Name: Dr. Test User
   - Title: MD
   - Bio: Test doctor
   - Registration Number: TEST12345
   - Licensing Body: Test Board
   - Credential Expiry: (future date)
   - Evidence Reference: test-evidence
   - Specializations: General Medicine
   - Languages: English

2. Click "Verify Doctor"

**Expected:** Success message, doctor appears in list  
**If error:** Check browser console and Vercel logs

---

## Troubleshooting

### Error: "doctors table exists" query failed
**Cause:** Migration didn't run successfully  
**Fix:** Check SQL Editor for error messages, run migration again

### Error: Still getting 503 on /api/admin/doctors
**Possible causes:**
1. SUPABASE_SECRET_KEY not set → Add in Vercel env vars
2. Code not deployed → Push and redeploy
3. Wrong Supabase URL → Check NEXT_PUBLIC_SUPABASE_URL

### Error: "Content-Security-Policy-Report-Only" still showing
**Cause:** Old build still deployed  
**Fix:** Force redeploy in Vercel dashboard

### Error: "permission denied for table doctors"
**Cause:** RLS policies incorrect  
**Fix:** Run this in Supabase SQL Editor:
```sql
GRANT ALL ON public.doctors TO service_role;
GRANT ALL ON public.doctor_appointments TO service_role;
GRANT ALL ON public.doctor_prescriptions TO service_role;
GRANT ALL ON public.doctor_messages TO service_role;
```

---

## Quick Summary

**What you need to do:**

1. ✅ Open `RUN_THIS_IN_SUPABASE.sql` → Copy → Paste in Supabase SQL Editor → Run
2. ✅ Run: `git add . && git commit -m "fix" && git push`
3. ✅ Add `ENFORCE_SAFETY_DUTY=false` in Vercel env vars
4. ✅ Verify `SUPABASE_SECRET_KEY` exists in Vercel
5. ✅ Test: Visit /api/health and /admin/doctors

**Time estimate:** 10-15 minutes total

**What gets fixed:**
- ✅ Doctors table will exist
- ✅ /api/admin/doctors will return 200 (not 503)
- ✅ CSP will be enforced (not report-only)
- ✅ Counsellors can go available
- ✅ Admins can create doctors

---

## Need Help?

**Check Vercel Logs:**
- Vercel → Deployments → Latest → Functions → api/admin/doctors
- Look for error messages

**Check Supabase Logs:**
- Supabase → Logs → Look for failed queries

**Common Issues:**
- Forgot to redeploy after adding env vars
- Used anon key instead of service_role key
- SQL migration had an error (check SQL Editor output)

---

**Status:** Ready to execute  
**Priority:** HIGH - Production is broken  
**Next Action:** Run the SQL migration in Supabase SQL Editor
