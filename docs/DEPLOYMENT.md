# Deployment Guide

Two deployment targets, as designed:

| Component | Target      |
| --------- | ----------- |
| Frontend  | **Vercel** (or any Node host / Docker) |
| Backend   | **VPS** (Docker or bare Node) |

The frontend is a static Next.js app that talks to the backend over HTTP; there is no runtime coupling between the two.

---

## 0. Push to GitHub (one time)

```bash
cd subdomain-generator
git init
git add .
git commit -m "Bulk subdomain generator: Next.js + Express + worker threads"
git branch -M main
git remote add origin https://github.com/<you>/genertsubdomain.git
git push -u origin main
```

---

## 1. Deploy the Backend to a VPS

### Option A — Docker (recommended)

```bash
# on the VPS
git clone <repo> && cd subdomain-generator

cp docker/.env.example .env
# edit .env → set CORS_ORIGIN=https://your-frontend.vercel.app

docker compose up -d --build backend
docker compose logs -f backend
```

The API is now on `http://your-vps-ip:4000`.

### Option B — Bare Node with systemd

```bash
cd backend
npm ci --omit=dev
npm run build
NODE_ENV=production PORT=4000 CORS_ORIGIN=https://your-frontend.vercel.app \
  DATABASE_PATH=/var/lib/subgen/subdomain-generator.db node dist/server.js
```

Example systemd unit (`/etc/systemd/system/subgen.service`):

```ini
[Unit]
Description=Subdomain Generator API
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/subdomain-generator/backend
Environment=NODE_ENV=production
Environment=PORT=4000
Environment=CORS_ORIGIN=https://your-frontend.vercel.app
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now subgen
```

### Put it behind nginx + TLS

```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> **Important:** when behind a proxy set `app.set('trust proxy', 1)` (or enable it in code) so rate limiting keys on the real client IP.

---

## 2. Deploy the Frontend to Vercel

> Fastest end-to-end setup: run **both** projects on Vercel — backend as a serverless
> function (Root Directory `backend`), frontend as the Next.js app (Root Directory
> `frontend`). Two Vercel projects, one repo.

### Step 1 — Deploy the API to Vercel (serverless)

The backend ships a serverless entrypoint (`backend/api/index.ts` + `backend/vercel.json`):

1. Create a Vercel project, set **Root Directory** to `backend`.
2. Deploy. Your API URL will be `https://<your-api-project>.vercel.app/api`.

   `backend/vercel.json` adds a rewrite so **every** `/api/*` path reaches the
   Express app (filesystem functions only match single-segment paths on Vercel).
   Verify with `https://<your-api-project>.vercel.app/api/health` — it should
   return a JSON health payload. Visiting the project root (`/`) also returns
   the health JSON instead of a 404.

Serverless caveats:

- **History is in-memory** on Vercel (Lambda filesystems are ephemeral) — the app auto-falls back to the memory store if the SQLite binary can't load.
- **Generation runs on the main thread** on Vercel (workers are disabled via `VERCEL=1`), so very large counts are slower than the VPS build. Use the VPS/Docker backend for millions.

### Step 2 — Deploy the dashboard to Vercel

1. Create a second Vercel project and set the **Root Directory** to `frontend` (the monorepo contains the Next.js app there).
2. Set the environment variable (in Vercel → Project → Settings → Environment Variables):

   ```
   NEXT_PUBLIC_API_URL=https://<your-api-project>.vercel.app/api
   ```

   > `NEXT_PUBLIC_*` variables are inlined at build time. Re-deploy if you change it.

3. Deploy. The dashboard is served at your Vercel URL.

`frontend/vercel.json` already configures the framework (`nextjs`) and clean URLs — nothing else is required.

> **Repo hygiene for Vercel:** `backend/` and `frontend/` are separate `package.json` projects. Vercel ignores the other one based on the Root Directory, so both can live in one repo.

### Troubleshooting — "deploys but dashboard shows *Backend API not reachable*"

By far the most common cause: `NEXT_PUBLIC_API_URL` is **not set** on the frontend
project, so the built bundle falls back to `http://localhost:4000/api` (the local dev
default) and the browser can't reach it. The dashboard now shows a banner with the
exact URL it's trying and a **Retry** button.

1. Set `NEXT_PUBLIC_API_URL` to your deployed API, e.g. `https://<your-api-project>.vercel.app/api` — **not** `localhost`, and **https** (browsers block `http://` from an `https://` page).
2. Re-deploy the frontend (env changes are build-time).
3. CORS is already open (`CORS_ORIGIN=*` default) — no extra config needed for the API.
4. Hit **Retry** on the dashboard to re-check without a reload.

---

## 3. Docker Compose (full stack on one VPS)

```bash
cp docker/.env.example .env
docker compose up -d --build
```

| Service   | Port    | Notes                                  |
| --------- | ------- | -------------------------------------- |
| backend   | 4000    | API; persists history in a named volume |
| postgres  | 5432    | optional, `--profile postgres`         |

The backend healthcheck keeps the container marked healthy.

---

## 4. Scaling & Production Notes

- **Worker threads** scale to CPU cores (`WORKER_POOL_SIZE=0`). On a 2-core VPS it uses 1 worker; on 16+ cores it caps at 8.
- **Millions of subdomains**: raise `MAX_SUBDOMAINS` if needed. Response bodies grow accordingly (a 1M-line JSON is ~25 MB) — use the TXT/CSV export endpoints for very large runs, or increase `express.json({ limit })` if sending domains with huge payloads.
- **PostgreSQL**: history storage is isolated behind the `HistoryStore` interface. Swap `SqliteHistoryStore` for a `PostgresHistoryStore` without touching controllers or services. The schema in `src/db/database.ts` is plain ANSI SQL.
- **Backups**: the SQLite file lives at `DATABASE_PATH` (volume `subgen_data`). Back it up or mount it to persistent storage.
