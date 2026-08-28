# MailCMH — Email & DNS Tooling Dashboard

A clean, production-style SaaS dashboard for **email extraction** (via IMAP) and **DNS lookups**.

```
Mailbox connection  →  Configure folders & fields  →  Real-time extraction  →  Results table
```

Live with real data only — no fake rows. Credentials are never stored, logged, or returned.

---

## Features

### Email Extraction
- **Mailbox connection** — Gmail / Outlook / Yahoo / iCloud / custom IMAP (auto provider detection with manual host/port override).
- **Test Connection** — live check with clear, human-readable errors (no raw stack traces).
- **Category (folder) selection** — loaded dynamically from the mailbox; select / clear / search + counter.
- **Data field selection** — From Name, From Email, To, CC, BCC, Subject, Date, Message ID, Reply-To, Body, HTML, Attachments.
- **Email range** — start index + count with quick presets and server-enforced limits.
- **Real-time progress** — SSE streaming: processed / found / skipped / errors, current folder, with rows appearing progressively.
- **Professional results table** — checkbox selection, row number, category badge, domain, per-column filters, sorting, sticky header, pagination (25–250/page), subject/email truncation + tooltips, row actions.
- **Bulk toolbar** — copy emails, export CSV / TXT / JSON, clear selection.
- **Exports** — CSV (UTF-8 + proper escaping), JSON, TXT (deduped, one per line), XLSX (styled + autofilter).
- **Stats** — found / processed / duplicates / errors / selected, plus a **remove duplicates** action.

### DNS Lookup
- A, AAAA, MX, TXT, CNAME, NS, SOA, SRV, DMARC, SPF.
- Search domain, select record types, live results with TTL / priority, per-record copy.

---

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React, Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Backend   | Node.js, Express, TypeScript            |
| Email     | `imapflow` + `mailparser`               |
| DNS       | Node `dns` module                       |
| Exports   | `exceljs` (XLSX), hand-rolled CSV/JSON/TXT |
| Security  | Helmet, CORS, Zod validation, rate limiting, credential-safe logging |
| Deploy    | Vercel (frontend **and** backend)      |

---

## Repository Layout

```
subdomain-generator/
├── backend/                  # Express REST API (deployed to Vercel as a serverless function)
│   ├── api/index.ts          # Vercel serverless entrypoint (exports the Express app)
│   ├── src/
│   │   ├── controllers/      # email + dns request handling
│   │   ├── services/         # imap, dns, export
│   │   ├── middleware/       # security, rate-limit, errors
│   │   ├── config/           # env config
│   │   └── types/            # shared contracts
│   ├── vercel.json           # serverless function config
│   └── .env.example
└── frontend/                 # Next.js dashboard (deployed to Vercel)
    ├── src/
    │   ├── app/              # pages (email-extraction, dns-lookup) + layout
    │   ├── components/       # ui + feature components
    │   ├── hooks/            # useEmailExtraction, useDnsLookup
    │   ├── lib/              # api client, utils
    │   └── types/
    ├── vercel.json
    └── .env.example
```

---

## Local Development

### 1. Backend API
```bash
cd backend
npm install
npm run dev            # http://localhost:4000
```

### 2. Frontend dashboard
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Open **http://localhost:3000**. Without `NEXT_PUBLIC_API_URL`, the frontend proxies `/api/*` to `http://localhost:4000` (configurable via `NEXT_PUBLIC_API_PROXY`).

---

## Deploy to Vercel (two projects, GitHub integration)

MailCMH ships as **two separate Vercel projects** sharing this one GitHub repository. Each Vercel project is configured with a **Root Directory**, so a push to `main` auto-deploys both.

### Project 1 — Backend API
1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo.
3. Set **Framework Preset** to *Other* and **Root Directory** to **`backend`**.
4. Add environment variables (Project → Settings → Environment Variables) as needed:
   - `CORS_ORIGIN` — set to your frontend URL (e.g. `https://your-app.vercel.app`) or `*` for development.
   - `EXTRACTION_RATE_LIMIT_MAX`, `MAX_EXTRACTION_COUNT`, `MAX_CONCURRENT_EXTRACTIONS` (optional).
5. Deploy. Note your backend URL: `https://<your-backend>.vercel.app`.

> Entry point is `backend/api/index.ts` (`vercel.json` routes all `/api/*` and `/` to it). Requires **Node 20.x** on the function runtime.

### Project 2 — Frontend
1. In Vercel: **New Project → Import** the same repo.
2. **Framework Preset** auto-detects *Next.js*. Set **Root Directory** to **`frontend`**.
3. Add env var:
   - `NEXT_PUBLIC_API_URL` = `https://<your-backend>.vercel.app`  *(no trailing slash)*
4. Deploy. Open `https://<your-app>.vercel.app`.

### GitHub auto-deploy
Once both projects are connected to the repo, every push to `main` triggers rebuilds of both projects (configure in Vercel → Project → Settings → Git → "Deploy Hooks" / production branch).

---

## Environment Variables

| Variable                    | Default               | Used by   | Description                                 |
| --------------------------- | --------------------- | --------- | ------------------------------------------- |
| `PORT`                      | `4000`                | backend   | local HTTP port                             |
| `NODE_ENV`                  | `development`         | backend   | runtime environment                         |
| `CORS_ORIGIN`               | `*`                   | backend   | allowed origin(s), comma separated          |
| `RATE_LIMIT_WINDOW_MS`      | `60000`               | backend   | rate-limit window                           |
| `RATE_LIMIT_MAX`            | `120`                 | backend   | requests per window per IP                  |
| `EXTRACTION_RATE_LIMIT_MAX` | `10`                  | backend   | extraction requests per window per IP       |
| `MAX_EXTRACTION_COUNT`      | `1000`                | backend   | max emails per extraction request           |
| `MAX_CONCURRENT_EXTRACTIONS`| `5`                   | backend   | concurrent extractions across all clients   |
| `NEXT_PUBLIC_API_URL`       | *(empty → local proxy)* | frontend | backend base URL (baked in at build time)   |
| `NEXT_PUBLIC_API_PROXY`     | `http://localhost:4000` | frontend | local dev proxy target (when API_URL empty) |

---

## API Reference (summary)

**Health:** `GET /api/health`

**Email:**
- `POST /api/email/test-connection` — `{ email, password, host?, port? }`
- `POST /api/email/folders` — `{ email, password, host?, port? }`
- `POST /api/email/extract` — SSE stream; `{ email, password, folders, startFrom, count, fields }`
- `POST /api/email/export` — `{ data, fields, format: csv|json|xlsx|txt }`

**DNS:**
- `GET /api/dns/types`
- `POST /api/dns/lookup` — `{ domain, types }`

---

## Security Notes

- Mailbox credentials are **in-memory per request only** — never logged, stored, or returned by the API.
- Logger redacts password/secret keys.
- Rate limits (global + extraction) and per-request extraction caps prevent abuse.
- Zod validation on every input; Helmet headers; CORS locked via `CORS_ORIGIN`.
- Clean human-readable error messages; full details are kept server-side only.

---

## Quality

```bash
# Backend
cd backend
npm run typecheck            # TypeScript
npm run typecheck:serverless # serverless entrypoint typecheck
npm run build                # production compile

# Frontend
cd frontend
npm run typecheck
npm run build                # Next.js production build
```

## License

MIT
