# Deployment Guide (Vercel + Render)

## 1) Prerequisites
- Push this project to a GitHub repository.
- MongoDB Atlas database reachable from deployment platform.
- Google OAuth app configured.
- VAPID keys generated for Web Push.

Generate VAPID keys once:

```bash
npx web-push generate-vapid-keys
```

## 2) Required Environment Variables
Set these on both Vercel and Render:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your deployed app URL)
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g. `mailto:admin@deenxzikr.com`)
- `CRON_SECRET`

Optional:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `NEXT_PUBLIC_ENABLE_EMAIL_MAGIC_LINK`

Render-only:

- `APP_BASE_URL` (same value as `NEXTAUTH_URL`, used by Render cron)

## 3) Google OAuth Redirects
In Google Cloud Console -> OAuth Client:

- Authorized JavaScript origins:
  - `https://<your-vercel-domain>`
  - `https://<your-render-domain>`
- Authorized redirect URIs:
  - `https://<your-vercel-domain>/api/auth/callback/google`
  - `https://<your-render-domain>/api/auth/callback/google`

## 4) Deploy to Vercel
### Option A: Dashboard
1. Import GitHub repo in Vercel.
2. Framework: Next.js.
3. Add env vars above.
4. Deploy.

### Option B: CLI
```bash
npx vercel
npx vercel --prod
```

`vercel.json` already includes a cron schedule every 10 minutes for prayer reminders.

## 5) Deploy to Render
This repo includes a Render Blueprint file:
- `render.yaml`

Steps:
1. In Render, choose **New +** -> **Blueprint**.
2. Select your GitHub repo.
3. Render will create:
   - Web service `deen-x-zikr`
   - Cron service `deen-x-zikr-prayer-reminders`
4. Fill required env vars (`sync: false` entries).
5. Deploy.

## 6) Post-Deploy Checks
- `/auth`: Google login works and returns to app.
- `/salah`: prayer times + push enable + test push.
- `/api/cron/prayer-reminders?secret=<CRON_SECRET>` returns success.
- Mobile header/nav and theme switching behave correctly.
