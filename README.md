# Bill-ORC — Receipt Tracker with OCR

A mobile-friendly web app for storing and organizing store receipts. Snap a
photo, let Claude's vision API extract the itemized data, correct any mistakes,
and save. Includes search, receipt details, and a monthly spending chart.

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS · Supabase
(Postgres + Auth + Storage) · Claude API for OCR · PWA-ready.

## One-time setup

You need free accounts at [supabase.com](https://supabase.com) and
[console.anthropic.com](https://console.anthropic.com).

1. **Create a Supabase project** (any name, any region).

2. **Create the database schema:** in the Supabase dashboard, open
   **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This
   creates the `receipts` and `receipt_items` tables, security rules so each
   user only sees their own data, and a private storage bucket for photos.

3. **Add your keys:** copy `.env.example` to a new file named `.env.local`
   and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
     Supabase **Settings → API**
   - `ANTHROPIC_API_KEY` — from the Anthropic Console **API Keys** page

4. *(Optional)* In Supabase **Authentication → Providers → Email**, turn off
   "Confirm email" if you want sign-up to work instantly without a
   confirmation email while testing.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be sent to the login page. Create an
account, then try **Upload** with a photo of any receipt.

## How it's organized

| Path | What it does |
|---|---|
| `supabase/schema.sql` | Database tables, security policies, storage bucket |
| `src/middleware.ts` | Keeps you logged in; blocks pages when signed out |
| `src/app/login/` | Sign in / sign up |
| `src/app/(app)/upload/` | Photo picker → OCR → editable form → save |
| `src/app/api/ocr/` | Server route that sends the image to Claude |
| `src/app/(app)/dashboard/` | Receipt list with search + date filter |
| `src/app/(app)/receipts/[id]/` | Receipt detail: items, totals, photo |
| `src/app/(app)/summary/` | Monthly spending chart |
| `public/manifest.webmanifest` | PWA manifest (installable on phones) |
