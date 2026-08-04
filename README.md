# Bill ORC — Receipt Tracker

A web app for storing and organizing store receipts. Take a photo of a receipt
and OCR (powered by the Claude API) automatically extracts the store name,
purchase date, itemized purchases, and totals.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — the web framework
- **Tailwind CSS** — styling
- **Supabase** — database (Postgres), authentication, and image storage
- **AI vision OCR** — receipt data extraction through any OpenAI-compatible
  chat-completions API (configured via `OCR_BASE_URL` / `OCR_MODEL` /
  `OCR_API_KEY` in `.env.local`; works with the KKU gateway, OpenAI, etc.)

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

### MVP Features (Complete)
- [x] Step 1 — Project scaffold (Next.js + TypeScript + Tailwind + PWA manifest)
- [x] Step 2 — Supabase connection + database schema
- [x] Step 3 — Auth (login/signup)
- [x] Step 4 — Receipt upload page
- [x] Step 5 — OCR API route (AI vision via OpenAI-compatible API)
- [x] Step 6 — Editable confirmation form + save
- [x] Step 7 — Dashboard / receipt list
- [x] Step 8 — Receipt detail page
- [x] Step 9 — Monthly spending chart

### Extended Features (Complete)
- [x] Framework upgrade to Next.js 16 with async cookies and Promise params
- [x] Edit receipts: modify store name, date, items, and totals after creation
- [x] Store analytics: top 5 stores by spending + "Other" rollup in summary page
- [x] Live deployment to Vercel with environment variable configuration
- [x] CSV export (receipts + items) with Thai headers, honoring dashboard filters
- [x] Expense categories: AI-guessed during OCR, editable, with per-category
      breakdown on the summary page
- [x] Sales logging (`/sales`): quick daily income entry, no OCR needed
- [x] Profit & loss (`/profit`): monthly income vs expense chart and table
- [x] Batch scanning: upload several receipt photos at once; OCR runs as a
      queue while you review finished ones (retry / manual entry / skip per photo)
- [x] Dashboard redesign: sidebar + bottom-nav app shell, KPI tiles, and an
      overview page with income-vs-expense bars, a ratio donut, category
      ranking and recent receipts. Chart colors are validated for colorblind
      separation; every chart ships a legend, direct labels and a table view.
- [x] Local AI OCR with automatic cloud fallback (see "Using a local AI model")

## Using a local AI model (saves cloud quota)

Receipt OCR can run on a model on your own machine, with the cloud API kept
only as a safety net. The app tries the local model first and automatically
falls back to the cloud when the local read fails, times out, or comes back
with no total and no items.

### Setup

1. Install [Ollama](https://ollama.com), then pull a **vision** model:
   ```bash
   ollama pull qwen2.5vl:7b
   ```
2. Confirm it is serving: `curl http://127.0.0.1:11434/v1/models`
3. In `.env.local`, point the primary at Ollama and keep the cloud as fallback
   (see [`.env.example`](.env.example) for the full block).
4. `npm run dev`, then scan as usual. A line above the review form tells you
   which engine read each receipt.

> **Use `127.0.0.1`, not `localhost`.** Node resolves `localhost` to IPv6 `::1`
> first, which Ollama does not listen on — you get a confusing `fetch failed`.

### Choosing a model for a 6 GB GPU

Reading a receipt photo needs a **vision** model, so text-only models (Llama,
Phi, GPT-OSS, DeepSeek-R1 …) cannot do this job regardless of how well they
would otherwise fit.

| Model | Ollama tag | ~VRAM (Q4) | Notes |
|---|---|---|---|
| **Qwen2.5-VL 7B** | `qwen2.5vl:7b` | ~4.7 GB | Best receipt/document accuracy that still fits 6 GB. Sits near the edge, so expect ~30–90 s per receipt. **Start here.** |
| Gemma 3 4B | `gemma3:4b` | ~3.3 GB | Comfortable fit, much faster, strong Thai. Switch to this if the 7B is too slow. |
| Qwen2.5-VL 3B | `qwen2.5vl:3b` | ~2.2 GB | Fastest, weakest on small print. |

Swapping is a one-line change to `OCR_MODEL` — trying all three costs nothing.

**What to expect:** printed Thai receipts read well locally. Handwritten Thai
bills often fail on a 6 GB model — those fall through to the cloud API, so
quota is still spent on hard receipts, just not on easy ones.

Run `npm run test:ocr` to check the provider/fallback logic against mock
servers (no GPU or API key needed).

## Troubleshooting

### OCR extraction fails with "Could not reach the AI service"

**Possible causes:**

1. **Environment variables not set** on Vercel
   - Go to Vercel project → Settings → Environment Variables
   - Ensure `OCR_API_KEY`, `OCR_BASE_URL`, and `OCR_MODEL` are all set
   - Redeploy after adding/updating env vars

2. **Network connectivity** (geolocation/network policy)
   - If using KKU AI gateway, it may not be accessible from Vercel's US-based infrastructure
   - Try switching to OpenAI API or another provider accessible from Vercel
   - Check your OCR provider's IP whitelisting or network restrictions

3. **API timeout**
   - A local model gets 180s and a cloud one 240s, inside a 300s function limit
   - Long or handwritten receipts are the slow case; smaller images process faster
   - When a local model is configured, timeouts fall through to the cloud fallback

4. **Supabase storage quota exceeded**
   - Free tier includes 1 GB of storage (database + images combined)
   - Check Supabase dashboard → Storage → Buckets → `receipts` for usage
   - Upgrade to a paid plan or delete old receipt images to free space

### Login doesn't work / "Authentication error"

1. **Missing Supabase configuration**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - On Vercel, check these are set in Environment Variables (Vercel project → Settings)

2. **Site URL mismatch** (Vercel deployment)
   - Go to Supabase → Authentication → URL Configuration
   - Add your Vercel domain (e.g., `https://bill-orc-xyz.vercel.app`) as a Redirect URL
   - Add it to the Site URL as well if using custom domain

### Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Set the **Production Branch** to `claude/receipt-ocr-app-cy20l3`
3. Set **Framework Preset** to `Next.js`
4. Add Environment Variables in Vercel project settings:
   - `OCR_API_KEY`
   - `OCR_BASE_URL`
   - `OCR_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Redeploy if you add or update env vars

### Light theme looks dark on dark-mode devices

The app enforces light mode throughout. If text appears dark/unreadable:
- Check your device's system theme setting
- The app uses explicit white backgrounds and dark text to override system preferences
- No browser darkening is applied; the issue should only appear if system dark mode is forcing an override
