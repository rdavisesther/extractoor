# MailCMH — Email Extractor (Python + Flask)

A clean, single-process **email extraction tool** that connects to any IMAP mailbox,
pulls message data live, and displays it in a fast web UI — with export, copy,
dedupe, and an auto-check for new emails.

```
Mailbox → Test connection → Load folders → Pick fields → Extract → Results table
```

---

## What it does

- **IMAP connection** — Gmail / Outlook / Hotmail / Yahoo / AOL / iCloud / custom
  IMAP. Provider is auto-detected from the email; host & port can be overridden.
- **Test connection** — live check with clear, human-readable errors
  (wrong password, host unreachable, timeout, SSL, rate limit…). No raw stack traces.
- **Folder selection** — list folders from the mailbox, search, multi-select with a counter.
- **Field selection** — From Name, From Email, To, CC, BCC, Subject, Date, Message ID,
  Reply-To, Body, HTML, attachments.
- **Range** — start index + how many messages to scan, with presets.
- **Results table** — select rows, per-column sorting, live search filter,
  sticky header, subject/email truncation with tooltips.
- **Toolbar** — copy selected emails, copy all rows, remove duplicates.
- **Export** — download as **CSV** or **JSON**.
- **Auto-check** — toggle to automatically re-check the mailbox every 30s and
  append only new messages (deduped by Message-ID).
- **Clear error display** — connection errors and per-message parse errors are
  shown on the page (the "update check error" you asked for).

---

## How it looks

Single-page UI: a 2-column form (connection + folders) on the left, fields + range
on the right, then progress and a large results table below. Plain HTML/CSS/JS,
no framework, no build step.

---

## Requirements

- Python 3.9+
- `pip install -r backend/requirements.txt` (only **Flask** — IMAP uses the stdlib)

---

## Run it

```bash
# 1. install the one dependency
cd backend
pip install -r requirements.txt

# 2. start the server
python app.py          # Flask on http://localhost:5000

# 3. open the app
# http://localhost:5000
```

The backend serves the static frontend (`frontend/index.html`, `.css`, `.js`),
so one command runs the whole app.

Optionally set a different port:

```bash
PORT=8000 python app.py   # Windows: $env:PORT=8000; python app.py
```

---

## Project layout

```
extractor email/
├── backend/                  # Python Flask app
│   ├── app.py                # Flask routes (test/connect/folders/extract/export + static)
│   ├── imap_extractor.py     # IMAP logic via stdlib imaplib + email
│   ├── requirements.txt      # flask
│   └── .env.example
└── frontend/                 # static UI, served by Flask
    ├── index.html
    ├── styles.css
    └── app.js                # all client logic (fetch, table, exports, auto-check)
```

---

## API

| Method | Route                   | Body                                   | Returns                         |
| ------ | ----------------------- | -------------------------------------- | ------------------------------- |
| GET    | `/api/health`           | —                                      | `{status:"ok"}`                 |
| POST   | `/api/test-connection`  | `{email,password,host?,port?}`         | `{success,provider,error?}`     |
| POST   | `/api/folders`          | `{email,password,host?,port?}`         | `{folders:[...]}`               |
| POST   | `/api/extract`          | `{email,password,folders,startFrom,count,fields}` | `{results,stats}` |
| POST   | `/api/export`           | `{data:[...], format:"csv"\|"json"}`   | file download                   |

---

## Security

- Credentials are used in-memory for the single request and never logged or stored.
- Only `email`, `password`, `host`, `port` are accepted — nothing else is persisted.
- Errors are human-friendly and never expose stack traces or secrets.

## License

MIT
