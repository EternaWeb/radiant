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
```

Redeploy after saving the variables.

## 5. Smoke Test

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
