# API Reference

Base URL: `http://localhost:4000/api` (or your deployed backend).

All responses are JSON. Errors use a consistent shape:

```json
{
  "success": false,
  "error": "Human readable message",
  "details": {}
}
```

---

## `POST /api/generate`

Generates subdomains and stores the run in history.

### Request body

| Field             | Type                                  | Required | Default    | Description                                             |
| ----------------- | ------------------------------------- | -------- | ---------- | ------------------------------------------------------- |
| `domains`         | `string[]`                            | yes      | —          | Root domains (max 1000). Invalid entries are dropped.   |
| `count`           | `number`                              | no       | `1000`     | Number of subdomains (1 – 1,000,000).                   |
| `categories`      | `Category[]`                          | no       | `[]`       | Selected prefix categories. `[]` = entire dictionary.   |
| `customPrefixes`  | `string[]`                            | no       | `[]`       | Extra prefixes, always included first.                  |
| `pattern`         | `PatternConfig`                       | no       | disabled   | Sequential pattern generator.                           |
| `randomMode`      | `boolean`                             | no       | `false`    | Readable creative prefixes.                             |
| `aiMode`          | `boolean`                             | no       | `false`    | Curated realistic prefixes.                             |
| `format`          | `'subdomain' \| 'https' \| 'http'`    | no       | `subdomain`| Output formatting.                                      |
| `requestId`       | `string`                              | no       | —          | Client-supplied correlation id.                         |

`Category` values: `common, business, corporate, security, cloud, hosting, api, finance, insurance, education, medical, technology, government, email, marketing, ecommerce, streaming, gaming, ai, crypto, random`.

`PatternConfig`:

```json
{
  "enabled": true,
  "bases": ["mail", "mx", "server:3"],
  "start": 1,
  "digits": 2,
  "direction": "asc"
}
```

`digits` controls zero-padding; append `:3` to a base to override padding for that base (`server:3` → `server001`).

### Example — basic

```bash
curl -X POST http://localhost:4000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"domains":["example.com"],"count":1000}'
```

```json
{
  "success": true,
  "total": 1000,
  "unique": 1000,
  "duplicatesRemoved": 0,
  "generationTimeMs": 41,
  "historyId": 12,
  "results": ["mail.example.com", "www.example.com", "..."]
}
```

### Example — bulk + categories + pattern

```json
{
  "domains": ["example.com", "google.com", "apple.com"],
  "count": 5000,
  "categories": ["email", "security", "ai"],
  "pattern": { "enabled": true, "bases": ["mail", "mx", "smtp", "server:3"], "start": 1, "digits": 2, "direction": "asc" },
  "format": "https"
}
```

### Errors

| Status | Reason |
| ------ | ------ |
| `400`  | Invalid body, no valid domains, bad count, malformed JSON |
| `429`  | Rate limit exceeded |

---

## `GET /api/health`

```json
{
  "status": "ok",
  "uptime": 1234,
  "timestamp": "2026-08-07T00:00:00.000Z",
  "workers": 8,
  "dictionarySize": 38437,
  "db": "sqlite"
}
```

---

## History

### `GET /api/history?limit=20&offset=0`

Lists saved generations, newest first.

```json
{
  "success": true,
  "items": [
    {
      "id": 12,
      "domains": ["example.com"],
      "count": 1000,
      "categories": ["email", "security"],
      "format": "subdomain",
      "unique": 1000,
      "duplicatesRemoved": 0,
      "generationTimeMs": 41,
      "results": ["mail.example.com", "..."],
      "createdAt": "2026-08-07T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### `GET /api/history/:id`

Returns `{ "success": true, "record": {...} }`. `404` if unknown.

### `DELETE /api/history/:id`

Deletes one record. Returns `{ "success": true, "removed": true }`.

### `DELETE /api/history`

Clears all history. Returns `{ "success": true, "removed": n }`.

### `GET /api/history/:id/export?format=txt`

Streams the stored results in the requested format.

| `format` | Content-Type                              |
| -------- | ----------------------------------------- |
| `txt`    | `text/plain`                              |
| `csv`    | `text/csv` (header: `subdomain`)          |
| `json`   | `application/json`                        |
| `xlsx`   | `application/vnd...spreadsheetml.sheet`   |

Example:

```bash
curl -OJ "http://localhost:4000/api/history/12/export?format=xlsx"
```

---

## Rate Limiting

- `/api/*`: `RATE_LIMIT_MAX` (default `120`) requests per window (default 60 s) per IP.
- `/api/generate`: stricter limit (`RATE_LIMIT_MAX / 3`).

Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`.
