# Deen X Zikr

Deen X Zikr is a modern minimal Islamic spiritual Progressive Web App (PWA) built with Next.js, TypeScript, Tailwind CSS, Framer Motion, and Zustand.

It provides:
- Accurate Salah times with geo-based calculation methods
- Qibla finder with real-time compass and map fallback
- Quran reading with translation, tafsir, audio reciters, bookmarks, and progress
- Hadith section with daily card, filters, favorites, and sharing
- Zikr tools (tasbih, duas, Hijri date, Ramadan mode, zakat calculator, streak)
- User dashboard with authentication and saved preferences
- Web Push prayer reminders with Vercel Cron dispatch

## Why Prayer Times Are Accurate

Prayer timing accuracy is based on:
- Coordinates from browser GPS or location search
- OpenStreetMap Nominatim geocoding (`/api/geo`) with support for city/town/village-level places
- AlAdhan timings API (`/api/prayer-times`) using exact latitude/longitude
- Selectable methods: MWL, ISNA, Umm Al-Qura

This combination supports even smaller places by relying on coordinate-based calculations, not only city-name matching.

## Tech Stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- Framer Motion
- Zustand (persisted local state)
- NextAuth (JWT session strategy)
- MongoDB (+ Auth adapter)
- Zod validation
- In-memory API rate limiting
- Fetch caching with Next.js revalidation
- Custom PWA manifest + service worker

## Project Structure

- `src/app` - routes and API handlers
- `src/components` - modular UI by domain
- `src/lib` - shared logic (auth, db, helpers, constants)
- `src/store` - Zustand persisted app state
- `public` - manifest, icons, service worker

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

Required for auth-enabled production:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Optional for email verification/magic links:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

Required for Web Push prayer reminders:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (example: `mailto:admin@deenxzikr.com`)
- `CRON_SECRET`

Generate VAPID keys once:

```bash
npx web-push generate-vapid-keys
```

## Local Development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm run lint
npm run build
```

## Vercel Deployment Guide

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Set framework preset to `Next.js`.
4. Add environment variables from `.env.example`.
5. Deploy.

Prayer push reminders are already integrated:
- Client subscription endpoints: `/api/push/public-key`, `/api/push/subscribe`, `/api/push/unsubscribe`
- Test endpoint: `/api/push/test`
- Cron dispatch endpoint: `/api/cron/prayer-reminders`
- Cron schedule: every 10 minutes via `vercel.json`

## Security + Reliability

- Zod input validation for API routes
- Basic rate limiting by requester IP
- JWT-based session strategy with NextAuth
- Cached upstream API calls with revalidation
- Error boundary (`src/app/error.tsx`)
- Environment-separated secrets
- Deduplicated reminder delivery using per-subscription last notification keys

## Notes

- The app is optimized as a responsive web app (not native mobile).
- PWA installability is enabled via `manifest.webmanifest` and `public/sw.js`.
- Offline fallback route is available at `/offline`.
