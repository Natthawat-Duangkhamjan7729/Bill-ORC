# Make.md — How Bill-ORC Was Built & How to Run It

This file explains what the app is, how it was built step by step, and exactly
what you need to do to get it running — written for someone with no coding
experience.

---

## What the app does

Bill-ORC is a mobile-friendly web app for storing and organizing store
receipts:

1. **Sign in** with email + password.
2. **Upload** a receipt photo (camera or file picker).
3. **OCR** — the photo is sent to the Claude API, which reads the receipt and
   returns the store name, date, every line item, subtotal, tax, and total.
4. **Review** — the extracted data appears in an editable form so you can fix
   any mistakes before saving.
5. **Save** — the photo goes to private cloud storage; the data goes to the
   database.
6. **Browse** — a dashboard lists all receipts (searchable by store name and
   date range), each with a detail page showing the items and original photo.
7. **Summary** — a chart of your total spending per month for the last year.

## The technology, in plain terms

| Piece | What it is | Why it's here |
|---|---|---|
| **Next.js** | The framework the app is built on | Handles pages, routing, and server code in one project |
| **TypeScript** | JavaScript with type checking | Catches typos and mistakes before they become bugs |
| **Tailwind CSS** | A styling system | Makes the app look good on phones and desktops |
| **Supabase** | A hosted Postgres database + login + file storage | Stores your account, receipts, and photos |
| **Claude API** | Anthropic's AI with vision | Reads the receipt photos (the OCR step) |
| **PWA manifest** | A small config file | Lets you install the site on a phone like an app |

## How it was built (one commit per step)

| Step | Commit | What it added |
|---|---|---|
| 1 | `Step 1` | Project scaffold: Next.js 16 + TypeScript + Tailwind |
| 2 | `Step 2` | Supabase connection helpers, `.env.example`, and `supabase/schema.sql` (tables + security rules + storage bucket) |
| 3 | `Step 3` | Login/signup page and the middleware that protects every page |
| 4–6 | `Steps 4-6` | Upload page with preview → `/api/ocr` route that calls Claude → editable confirmation form → save to database |
| 7–8 | `Steps 7-8` | Dashboard list with search/filter + receipt detail page with photo and delete |
| 9 | `Step 9` | Monthly spending chart, PWA manifest + icons, setup README |

Key security choices baked in:

- The Anthropic API key is only used **server-side** (in `/api/ocr`), so it is
  never visible to anyone's browser.
- **Row-level security** in the database means each user can only ever read or
  change their own receipts — enforced by Postgres itself, not just the app.
- Receipt photos live in a **private** storage bucket; the app creates
  short-lived signed links to display them.

---

## Setup (one time, ~10 minutes)

You need two free accounts: [supabase.com](https://supabase.com) and
[console.anthropic.com](https://console.anthropic.com).

### 1. Get the code

```bash
git clone https://github.com/Natthawat-Duangkhamjan7729/Bill-ORC.git
cd Bill-ORC
git checkout claude/receipt-ocr-app-usgjaw
npm install
```

(`npm install` downloads the app's dependencies — it can take a minute.)

### 2. Create the database

1. At supabase.com, create a new project (any name/region; save the database
   password it asks you to set, though you won't need it day-to-day).
2. In the project dashboard, open **SQL Editor → New query**.
3. Paste the entire contents of the file `supabase/schema.sql` from this repo
   and click **Run**. You should see "Success. No rows returned."

### 3. Add your keys

1. In the repo, copy `.env.example` to a new file named exactly `.env.local`.
2. Fill in the three values:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase dashboard → **Settings → API** →
     "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page → "anon public" key
   - `ANTHROPIC_API_KEY` — console.anthropic.com → **API Keys** → Create Key

`.env.local` is listed in `.gitignore`, so your secrets can never be
accidentally committed.

> 💰 Cost note: each receipt scan is one Claude API call — typically a cent or
> two. Supabase's free tier is plenty for personal use.

### 4. (Recommended while testing) instant sign-up

In Supabase → **Authentication → Providers → Email**, turn off **Confirm
email**. Otherwise every new account must click a link in a confirmation email
before signing in.

---

## Run it

```bash
npm run dev
```

Open http://localhost:3000. You'll land on the login page — create an account,
then:

1. Tap **Upload** and choose a photo of any receipt.
2. Press **Extract data** and wait ~10–30 seconds.
3. Fix anything the OCR got wrong, then **Save receipt**.
4. Check **Receipts** (the dashboard) and **Summary** (the chart).

To stop the app, press `Ctrl+C` in the terminal.

## Troubleshooting

| Symptom | Likely fix |
|---|---|
| "Server is missing ANTHROPIC_API_KEY" | Create `.env.local` (step 3) and restart `npm run dev` |
| "Invalid ANTHROPIC_API_KEY" | Re-copy the key from the Anthropic console |
| Sign-up says "check your email" forever | Turn off Confirm email (step 4), or click the link in your inbox |
| "Could not load receipts" / save fails | The SQL from step 2 probably wasn't run — run `supabase/schema.sql` in the SQL Editor |
| Image upload fails | Same as above — the storage bucket is created by that SQL script |

## Next steps (when you're ready)

- **Deploy to Vercel** so you can use it from your phone anywhere (free tier
  works; set the same three environment variables in the Vercel dashboard).
- **Install on your phone**: once deployed, open the site in your phone's
  browser and choose "Add to Home Screen" — the PWA manifest makes it behave
  like an app.
