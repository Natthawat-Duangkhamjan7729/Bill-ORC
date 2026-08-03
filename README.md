# Bill ORC

A web app for storing and organizing store receipts. Snap a photo of a
receipt and the app uses OCR (via the Claude API) to automatically extract
the store name, date, itemized purchases, and totals — which you can review
and correct before saving.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres database, auth, and image storage
- Claude API (vision) for receipt OCR

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Project status

Being built incrementally:

- [x] 1. Scaffold Next.js + TypeScript + Tailwind project
- [ ] 2. Supabase connection + database schema
- [ ] 3. Auth (login/signup pages)
- [ ] 4. Receipt upload page with image preview
- [ ] 5. `/api/ocr` route calling the Claude API
- [ ] 6. Editable confirmation form + save to database
- [ ] 7. Dashboard/list view with search
- [ ] 8. Receipt detail view
- [ ] 9. Monthly spending chart
