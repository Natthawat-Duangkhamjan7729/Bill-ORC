# Bill ORC — Receipt Tracker

A web app for storing and organizing store receipts. Take a photo of a receipt
and OCR (powered by the Claude API) automatically extracts the store name,
purchase date, itemized purchases, and totals.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — the web framework
- **Tailwind CSS** — styling
- **Supabase** — database (Postgres), authentication, and image storage
- **Claude API** — vision-based OCR for receipt data extraction

## Running the app locally

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Create your local settings file (first time only)
#    On Windows use:  copy .env.example .env.local
cp .env.example .env.local

# 3. Start the development server
npm run dev
```

Then open http://localhost:3000 in your browser.

### One-time database setup

Open your project on [supabase.com](https://supabase.com) → **SQL Editor** →
**New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql),
and click **Run**. This creates the `receipts` and `receipt_items` tables, the
security rules (each user can only see their own data), and the private storage
bucket for receipt images. It is safe to run more than once.

## Project status

- [x] Step 1 — Project scaffold (Next.js + TypeScript + Tailwind + PWA manifest)
- [x] Step 2 — Supabase connection + database schema
- [x] Step 3 — Auth (login/signup)
- [ ] Step 4 — Receipt upload page
- [ ] Step 5 — OCR API route (Claude vision)
- [ ] Step 6 — Editable confirmation form + save
- [ ] Step 7 — Dashboard / receipt list
- [ ] Step 8 — Receipt detail page
- [ ] Step 9 — Monthly spending chart
