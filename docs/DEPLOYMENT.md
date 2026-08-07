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

1. Push the repo to GitHub/GitLab (see below).
2. Import the repository in Vercel and set the **Root Directory** to `frontend` (the monorepo contains the Next.js app there).
3. Set the environment variable (in Vercel → Project → Settings → Environment Variables):

   ```
   NEXT_PUBLIC_API_URL=https://api.example.com/api
   ```

   > `NEXT_PUBLIC_*` variables are inlined at build time. Re-deploy if you change it.

4. Deploy. The dashboard is served at your Vercel URL.

`frontend/vercel.json` already configures the framework (`nextjs`) and clean URLs — nothing else is required.

> **Repo hygiene for Vercel:** `backend/` and `frontend/` are separate `package.json` projects. Vercel ignores the other one based on the Root Directory, so both can live in one repo.

### Optional: deploy the API to Vercel too

The backend ships a serverless entrypoint (`backend/api/index.ts` + `backend/vercel.json`), so you can run the API on Vercel as a separate project:

1. Create a second Vercel project and set **Root Directory** to `backend`.
2. That's it — `api/index.ts` is picked up automatically (60 s max duration).

Serverless caveats:

- **History is in-memory** on Vercel (Lambda filesystems are ephemeral) — the app auto-falls back to the memory store if the SQLite binary can't load.
- **Generation runs on the main thread** on Vercel (workers are disabled via `VERCEL=1`), so very large counts are slower than the VPS build. Use the VPS/Docker backend for millions.

For persistent history and full performance, prefer the VPS backend.

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
