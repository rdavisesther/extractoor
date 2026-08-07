# Bulk Subdomain Generator

A fast, modern web application that generates **hundreds to millions of realistic subdomains** from one or many root domains.

```
example.com  →  mail.example.com · www.example.com · app.example.com
                 api.example.com · blog.example.com · cdn.example.com
```

**Live example**

```
Input:  example.com
Output:
  mail.example.com
  www.example.com
  app.example.com
  api.example.com
  blog.example.com
  cdn.example.com
  ...
```

---

## Highlights

- ⚡ **Worker-thread parallelism** — generates 100,000 subdomains in under half a second.
- 📖 **20,000+ prefix dictionary** across 21 categories (technology, email, finance, insurance, medical, security, banking, hosting, AI, crypto, and more).
- 🤖 **AI Smart Generator** — curated, realistic prefixes (`customer-support`, `billing`, `gateway`, …).
- 🔀 **Random mode** — readable creative prefixes (`horizon`, `nova`, `vertex`, …).
- 🔢 **Pattern generator** — `mail01, mail02, …`, `server001, …`, with configurable start/digits/direction.
- 🧹 **Automatic duplicate detection** — never repeats a subdomain.
- 🗂 **Bulk input** — textarea, `.txt` upload, or `.csv` upload (first column read automatically).
- 💾 **Exports** — TXT, CSV, JSON, Excel (`.xlsx`), Copy All.
- 🕘 **History** — reopen and re-download past generations.
- 🔍 **Search / filter / sort** — contains / starts-with / ends-with / length + 4 sort modes.
- 🌗 **Dark mode** with remembered preference.
- 📊 **Progress bar, statistics** (total / unique / duplicates / generation time).
- 🛡 **Security-first** — input validation, XSS sanitization, SQL-injection-safe (parameterized queries), rate limiting, Helmet, CORS.

---

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | React, Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Backend   | Node.js, Express, TypeScript                 |
| Database  | SQLite (dev) · PostgreSQL-ready              |
| Performance | Worker threads (`node:worker_threads`)      |
| Deploy    | Docker · Vercel (frontend + optional API) · VPS (backend) |

---

## Repository Layout

```
subdomain-generator/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── controllers/      # request handling
│   │   ├── services/         # generation, dictionary, history, export
│   │   ├── workers/          # worker-thread pool + worker entry
│   │   ├── middleware/       # security, rate-limit, validation, errors
│   │   ├── db/               # SQLite bootstrap
│   │   ├── utils/            # validation, sanitization, logging
│   │   └── types/            # shared contracts
│   ├── api/index.ts          # Vercel serverless entrypoint
│   ├── data/dictionary.json  # 38k+ generated prefixes (do not edit by hand)
│   ├── scripts/              # dictionary generator
│   ├── tests/                # Vitest unit + integration tests
│   ├── vercel.json           # Vercel function config
│   └── Dockerfile
├── frontend/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/              # layout + dashboard page
│   │   ├── components/       # modular UI components
│   │   ├── hooks/            # central generator state hook
│   │   ├── lib/              # API client, downloads, utils, theme
│   │   └── types/            # API contracts
│   ├── vercel.json           # Vercel framework config
│   └── Dockerfile
├── docs/
│   ├── API.md                # REST API reference
│   └── DEPLOYMENT.md         # VPS / Vercel / Docker guides
├── docker-compose.yml
└── docker/.env.example
```

---

## Quick Start (Development)

### 1. Backend API

```bash
cd backend
npm install
npm run dictionary     # (re)generates data/dictionary.json (38k+ prefixes)
npm run dev            # starts API on http://localhost:4000
```

### 2. Frontend dashboard

```bash
cd frontend
npm install
npm run dev            # starts Next.js on http://localhost:3000
```

Open **http://localhost:3000**. The dashboard auto-detects the API at `http://localhost:4000/api`.

> Set `NEXT_PUBLIC_API_URL` to point at a deployed backend:
> ```bash
> # frontend/.env.local
> NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
> ```

---

## Quick Start (Docker)

```bash
cp docker/.env.example .env
docker compose up -d --build
# Frontend is deployed separately (see docs/DEPLOYMENT.md),
# but the backend container now listens on http://localhost:4000
```

Optional PostgreSQL (for when you swap the history store to Postgres):

```bash
docker compose --profile postgres up -d postgres
```

---

## Deploy to Vercel

1. Push this repo to GitHub (see `docs/DEPLOYMENT.md` §0).
2. **Frontend** → import the repo in Vercel, set **Root Directory** to `frontend`, add env `NEXT_PUBLIC_API_URL` → deploy.
3. **Backend (optional)** → second Vercel project with **Root Directory** `backend` (serverless entry at `backend/api/index.ts`).

For persistent history and million-scale performance, run the backend on a VPS instead (see `docs/DEPLOYMENT.md`).

---

## REST API (summary)

```http
POST /api/generate
```

```json
{
  "domains": ["example.com"],
  "count": 1000
}
```

```json
{
  "success": true,
  "total": 1000,
  "unique": 1000,
  "duplicatesRemoved": 0,
  "generationTimeMs": 42,
  "historyId": 12,
  "results": ["mail.example.com", "www.example.com", "..."]
}
```

Other endpoints: `GET /api/health`, `GET /api/history`, `GET /api/history/:id`, `GET /api/history/:id/export?format=…`, `DELETE /api/history/:id`, `DELETE /api/history`.

Full reference with every option (categories, patterns, AI mode, formats): **[docs/API.md](docs/API.md)**.

---

## Environment Variables

| Variable                | Default                       | Used by    | Description                                  |
| ----------------------- | ----------------------------- | ---------- | -------------------------------------------- |
| `PORT`                  | `4000`                        | backend    | HTTP port                                    |
| `NODE_ENV`              | `development`                 | backend    | runtime environment                          |
| `CORS_ORIGIN`           | `*`                           | backend    | allowed origin(s), comma separated           |
| `RATE_LIMIT_WINDOW_MS`  | `60000`                       | backend    | rate-limit window                            |
| `RATE_LIMIT_MAX`        | `120`                         | backend    | requests per window per IP                   |
| `DATABASE_PATH`         | `./data/subdomain-generator.db` | backend  | SQLite file (or `:memory:`)                  |
| `WORKER_POOL_SIZE`      | `0` (auto)                    | backend    | worker thread count                          |
| `MAX_SUBDOMAINS`        | `1000000`                     | backend    | per-request ceiling                          |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:4000/api`   | frontend   | backend base URL (baked in at build)         |

See `backend/.env.example` and `docker/.env.example`.

---

## Testing & Quality

```bash
# Backend
cd backend
npm test            # 41 unit + integration tests
npm run lint:check  # ESLint
npm run typecheck   # TypeScript
npm run build       # production compile

# Frontend
cd frontend
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # TypeScript
npm run build       # Next.js production build
```

---

## Performance

| Configuration              | Result                        |
| -------------------------- | ----------------------------- |
| 1,000 subdomains           | ~10–20 ms                     |
| 100,000 subdomains         | ~440 ms across 8 worker threads |
| Millions                   | supported via `MAX_SUBDOMAINS` (worker pool scales to CPU cores) |

Generation is chunked across a persistent **worker-thread pool** (`cpus - 1`, max 8), so the HTTP server never blocks and the UI never freezes.

---

## Security

- **Input validation** — Zod schemas + strict domain regex on every request.
- **XSS prevention** — prefixes are sanitized to DNS-safe labels; output is rendered as text, never HTML.
- **SQL injection** — all queries use parameterized statements (`better-sqlite3` prepared statements).
- **Helmet** sets secure HTTP headers; **CORS** is locked to configured origins.
- **Rate limiting** on the API and stricter limits on the expensive `/generate` route.
- No secrets are stored or logged.

---

## Documentation

- [API Reference](docs/API.md)
- [Deployment Guide (Vercel + VPS + Docker)](docs/DEPLOYMENT.md)

## License

MIT
