# Radiant Auth Setup

Use this checklist to finish the production configuration for `https://radiant.trymindcore.com`.

## 1. Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/migrations/001_auth_and_orgs.sql`.
3. Go to **Authentication > URL Configuration**.
4. Set **Site URL** to:
   - `https://radiant.trymindcore.com`
5. Add **Redirect URLs**:
   - `https://radiant.trymindcore.com/auth/callback`
   - Your Vercel preview callback URLs if you need preview testing.
6. Copy these values into Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it in the browser.

## 2. Google Cloud Console

1. Open Google Cloud Console and create or select a project.
2. Configure the OAuth consent screen for your organization.
3. Create an **OAuth 2.0 Client ID** with application type **Web application**.
4. Add authorized JavaScript origins:
   - `https://radiant.trymindcore.com`
   - `https://<your-supabase-project-ref>.supabase.co`
5. Add the authorized redirect URI:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
6. Copy the Google Client ID and Client Secret.
7. In Supabase, go to **Authentication > Providers > Google**, enable Google, and paste the Client ID and Client Secret.

## 3. Resend

1. In Resend, add the domain `radiant.trymindcore.com`.
2. Add the DNS records Resend gives you:
   - SPF
   - DKIM
   - DMARC if Resend recommends it for your domain
3. Wait until Resend shows the domain as verified.
4. Create a Resend API key.
5. Add these Vercel environment variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL=Radiant <invites@radiant.trymindcore.com>`

The sender address must match a verified Resend domain.

## 4. Vercel

Add these environment variables to Production:

```env
NEXT_PUBLIC_APP_URL=https://radiant.trymindcore.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=Radiant <invites@radiant.trymindcore.com>

# Imaging analysis
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o
OPENAI_VISION_TIMEOUT_MS=60000
OPENAI_VISION_MAX_TOKENS=800
RISK_HIGH_THRESHOLD=70

# Optional: comma-separated public PNG/JPEG URLs for /api/studies/seed
SEED_CHEST_XRAY_URLS=
```

Redeploy after saving the variables.

## 5. GPT-4o Vision AI Pipeline

1. Create an OpenAI API key with GPT-4o Vision access.
2. Add `OPENAI_API_KEY` and the `OPENAI_VISION_*` variables to Vercel.
3. Run all Supabase migrations, including `003_gpt_vision_analysis.sql`.
4. Keep `RISK_HIGH_THRESHOLD=70` unless the alert threshold should change.
5. Configure Resend so high-risk studies can email admins.

Radiant sends uploaded X-rays from Supabase Storage to GPT-4o Vision, validates strict JSON, stores zone-aware findings, renders frontend lung-zone overlays, and creates alerts for high-risk cases.

## 6. Imaging Smoke Test

1. Open the dashboard and go to **Imaging**.
2. Enter a patient ID, patient name, optional SpO2, fever, and symptoms.
3. Upload a PNG/JPEG/WebP chest X-ray.
4. Confirm the study appears in **PACS Archive**.
5. Click **Upload & analyze** and confirm:
   - findings are saved,
   - risk score is computed,
   - report is generated,
   - GPT lung-zone overlays appear in the viewer,
   - high-risk studies create an alert and email admins through Resend.
6. As an admin, call `POST /api/studies/seed` to archive demo NIH chest X-ray samples.

### Troubleshooting `MIDDLEWARE_INVOCATION_FAILED`

If the site returns **500** with `MIDDLEWARE_INVOCATION_FAILED`, check these first:

1. **Supabase env vars are set in Vercel Production** — not just Preview. Values must be non-empty:
   - `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://xxxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Redeploy after changing env vars** — Vercel does not inject new variables into an existing deployment until you redeploy.
3. In the Vercel deployment **Functions** log, look for `Cannot find module '@swc/helpers/esm/...'`. If you see that, ensure the project uses a hoisted `node_modules` layout (`.npmrc` with `node-linker=hoisted`) and redeploy.

## 7. Auth Smoke Test

1. Visit `https://radiant.trymindcore.com`.
2. Sign in with Google as the first user.
3. Enter full name, choose a clinical role, enter hospital and department, and complete onboarding.
4. Confirm the dashboard opens and Settings shows:
   - Workspace role: `admin`
   - Is admin: `Yes`
5. In Departments, invite another user by email.
6. Open the invite email and click the invite link.
7. Sign in with the invited Google account.
8. Complete onboarding and confirm the user joins the correct hospital and department as a participant.
9. In Settings, add a phone number and verify it remains saved after refresh.
10. Sign out and confirm the session returns to the welcome screen.
