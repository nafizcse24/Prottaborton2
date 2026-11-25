# প্রত্যাবর্তন ২.০ (PROTTABORTON 2.0)

Cinematic countdown experience, historical context ("প্রেক্ষাপট"), and real-time Supabase-powered public visitor statistics for **PROTTABORTON 2.0** targeting **16 December 2026** (`Asia/Dhaka`, UTC+6).

---

## Features

- **Live Countdown Engine**: Real-time Days, Hours, Minutes, and Seconds targeting `2026-12-16T12:00:00+06:00` with English (`0-9`) / Bengali (`০-৯`) numeral toggle.
- **Historical Context ("প্রেক্ষাপট")**: Editorial narrative with timeline milestones, interactive expand/collapse control, pillars grid, and tribute wall.
- **Real-Time Public Visitor Counter**:
  - **Total Visits (মোট পরিদর্শন)**: Deduplicated browsing sessions across all visitors.
  - **Unique Visitors (অনন্য দর্শনার্থী)**: Persistent anonymous visitor UUID (`localStorage`), without collecting IP addresses or PII.
  - **Today's Visits (আজকের পরিদর্শন)**: Computed in **Asia/Dhaka (UTC+6)** calendar day on the database server.
- **Zero-Trust Security Architecture**:
  - Row Level Security (RLS) enabled with direct table permissions revoked from `anon` and `authenticated`.
  - Protected PostgreSQL `SECURITY DEFINER` RPCs (`record_visit` & `get_visitor_stats`).
  - Optional Deno Edge Functions included in `supabase/functions/`.

---

## Project Structure

```text
.
├── index.html                  # Main landing page & public visitor analytics UI
├── styles.css                  # Cinematic styling & responsive layouts
├── script.js                   # Countdown, audio synth, calendar export & tribute feed
├── analytics.js                # Privacy-first Supabase visitor tracking client
├── supabase.config.js          # Public Supabase URL & publishable key configuration
├── .env.example                # Environment variables reference template
├── .nojekyll                   # Bypass Jekyll processing on GitHub Pages
└── supabase/
    ├── schema.sql              # Tables, indexes, RLS policies & RPC functions
    └── functions/
        ├── _shared/cors.ts     # Shared CORS headers for Edge Functions
        ├── get-stats/index.ts  # Read-only Edge Function endpoint
        └── record-visit/index.ts # Visit ingestion Edge Function endpoint
```

---

## Deployment

### Static Hosting (GitHub Pages / Vercel / Netlify / Cloudflare Pages)
This project requires **zero build steps** and serves directly from the repository root (`index.html`).

1. **Database Setup**: Run `supabase/schema.sql` once in your Supabase project's **SQL Editor**.
2. **Configuration**: Ensure `supabase.config.js` contains your Supabase **Project URL** and **Publishable / Anon Key** (never commit secret or `service_role` keys).
3. **Publish**:
   - **GitHub Pages**: Enable Pages under **Settings &rarr; Pages &rarr; Deploy from a branch (`main` / `/root`)**.
   - **Vercel / Netlify**: Connect the repository with no build command and publish directory `.`.

### Local Preview
```bash
npm start
# or
python3 -m http.server 3000
```
