# CVForge

[![CI](https://github.com/sam-razavi/cvforge/actions/workflows/ci.yml/badge.svg)](https://github.com/sam-razavi/cvforge/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![BullMQ](https://img.shields.io/badge/BullMQ-5-FF4500?logo=redis&logoColor=white)](https://docs.bullmq.io)
[![Tests](https://img.shields.io/badge/tests-38%20passing-brightgreen)](./src)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)](#)

Async AI microservice that rewrites CVs, generates cover letters, and scores job-description match. Built for [ApplyLuma](https://applyluma.vercel.app) — call it from a Next.js server action or any backend.

---

## How it works

```
Client
  │
  ├─ POST /rewrite  (PDF or plain text + job description)
  │       │
  │       ▼
  │  BullMQ queue (Redis)
  │       │
  │       ▼
  │  RewriteProcessor
  │       ├─ pdf-parse   → extract text
  │       ├─ OpenAI      → rewrite CV
  │       ├─ OpenAI      → generate cover letter
  │       └─ OpenAI      → match score + keywords
  │
  ├─ Socket.IO  ←── progress events at each stage (10 → 40 → 70 → 90 → 100%)
  │
  └─ GET /jobs/:id/result  ←── fetch the finished output
```

---

## Features

- **PDF or text input** — upload a PDF (≤ 5 MB) or send plain text
- **Three AI outputs** — rewritten CV, tailored cover letter, match score with keyword list
- **Real-time progress** — Socket.IO events at every pipeline stage
- **Language support** — English and Swedish
- **Tone control** — professional, confident, or concise
- **Queue priority** — 1–10 priority per job
- **API key auth** — SHA-256 hashed keys, `x-api-key` header
- **Bull Board UI** — queue dashboard at `/admin/queues` (HTTP Basic Auth)
- **Production-ready** — retries with exponential backoff, rate limiting, graceful shutdown

---

## Quick start

**Prerequisites:** Docker, Node 22, an OpenAI API key.

```bash
# 1. Clone and install
git clone https://github.com/sam-razavi/cvforge
cd cvforge
npm install

# 2. Configure
cp .env.example .env
# → open .env and set OPENAI_API_KEY

# 3. Start Postgres + Redis
docker compose up -d

# 4. Run migrations
npx prisma migrate deploy

# 5. Create an API key
node scripts/create-api-key.mjs dev

# 6. Start the server
npm run start:dev
```

Server starts on `http://localhost:3000`.  
Bull Board: `http://localhost:3000/admin/queues` — user `admin`, pass `change-me`.

---

## API

All endpoints except `/health` require an `x-api-key: cvf_<key>` header.

### `POST /rewrite`

Enqueues a rewrite job and returns immediately.

| Field | Type | Required | Notes |
|---|---|---|---|
| `cv` | file (multipart) | no* | PDF ≤ 5 MB |
| `cvText` | string | no* | Plain-text CV, ≤ 50 000 chars |
| `jobDescription` | string | **yes** | ≤ 10 000 chars |
| `language` | `en` \| `sv` | no | Default `en` |
| `tone` | `professional` \| `confident` \| `concise` | no | Default `professional` |
| `priority` | integer 1–10 | no | Lower = higher priority. Default `5` |

*One of `cv` (PDF) or `cvText` must be provided.

**Response `201`**
```json
{
  "jobId": "42",
  "recordId": "018f1b3a-4c2d-7e8f-b1c9-...",
  "status": "queued",
  "position": 3
}
```

> `jobId` — use for WebSocket subscription and status polling.  
> `recordId` — use to fetch the final result from the database.

---

### `GET /jobs/:jobId`

Current queue state for a job.

**Response `200`**
```json
{
  "jobId": "42",
  "status": "active",
  "progress": { "stage": "rewriting", "percent": 40 }
}
```

`status` is a BullMQ queue state: `waiting` | `active` | `completed` | `failed` | `delayed`.

---

### `GET /jobs/:recordId/result`

Fetch the finished output. Returns `409` while still running.

**Response `200`**
```json
{
  "rewrittenCv": "...",
  "coverLetter": "...",
  "matchScore": 87,
  "keywordsAdded": ["TypeScript", "CI/CD", "Agile"]
}
```

---

### `GET /health`

No auth required. Returns `{ "status": "ok", "version": "0.0.1" }`.

---

## Real-time progress (Socket.IO)

```ts
import { io } from 'socket.io-client';

const socket = io('https://<cvforge-url>', { transports: ['websocket'] });

socket.emit('subscribe', { jobId });

socket.on('progress', ({ stage, percent }) => {
  // stage: "extracting" | "rewriting" | "cover_letter" | "scoring" | "done"
  updateProgressBar(percent);
});

socket.on('completed', (result) => {
  // result = { rewrittenCv, coverLetter, matchScore, keywordsAdded }
  displayResult(result);
  socket.disconnect();
});

socket.on('failed', ({ error }) => {
  showError(error);
  socket.disconnect();
});
```

| Stage | % |
|---|---|
| `extracting` | 10 |
| `rewriting` | 40 |
| `cover_letter` | 70 |
| `scoring` | 90 |
| `done` | 100 |

---

## Configuration

Copy `.env.example` to `.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string |
| `REDIS_HOST` | no | `localhost` | Redis host |
| `REDIS_PORT` | no | `6379` | Redis port |
| `OPENAI_API_KEY` | **yes** | — | OpenAI secret key |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Model to use |
| `MAX_CONCURRENCY` | no | `5` | Parallel jobs per worker |
| `RATE_LIMIT_MAX` | no | `20` | Max jobs per rate window |
| `RATE_LIMIT_DURATION_MS` | no | `60000` | Rate limit window (ms) |
| `BULL_BOARD_USER` | no | `admin` | Bull Board username |
| `BULL_BOARD_PASSWORD` | no | `change-me` | Bull Board password |
| `CORS_ORIGINS` | no | `http://localhost:5173` | Comma-separated allowed origins |

---

## Development

```bash
npm run start:dev     # watch mode
npm test              # 29 unit tests
npm run test:e2e      # 9 e2e tests  (no live services needed)
npm run test:cov      # coverage report
npm run build         # production build → dist/
```

---

## Managing API keys

```bash
# Generates a key, stores the SHA-256 hash, prints the plaintext once
node scripts/create-api-key.mjs "my-label"

#  API key created for: my-label
#
#    cvf_4a7b3c...
#
#  This key will not be shown again. Store it securely.
```

All requests must include `x-api-key: cvf_<key>`.

---

## Deployment

### Railway (recommended)

1. Create a Railway project and add **Postgres** and **Redis** services.
2. Link this repo — Railway detects the `Dockerfile` automatically.
3. Add environment variables in the Railway dashboard.
4. Deploy. The container runs `prisma migrate deploy` before the server starts.
5. Create a production API key (run against the Railway Postgres URL):

```bash
DATABASE_URL=<railway-postgres-url> node scripts/create-api-key.mjs "applyluma-prod"
```

### Docker (self-hosted)

```bash
docker build -t cvforge .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=... \
  -e OPENAI_API_KEY=sk-... \
  cvforge
```

---

## ApplyLuma integration checklist

- [ ] Deploy CVForge and note the public URL
- [ ] Set `CORS_ORIGINS` to include your Vercel domain (e.g. `https://applyluma.vercel.app`)
- [ ] Create a production API key and save it as `APPLYLUMA_CV_API_KEY` in Vercel
- [ ] Add `CVFORGE_URL` (the Railway URL) to Vercel environment variables
- [ ] On job submission: `POST /rewrite` → store both `jobId` and `recordId`
- [ ] Subscribe to Socket.IO with `jobId` for live progress updates
- [ ] On `completed` event: display result or call `GET /jobs/:recordId/result`
- [ ] Add polling fallback (`GET /jobs/:recordId/result` every 5 s) for clients without WebSocket

Full code samples → [`docs/INTEGRATION.md`](./docs/INTEGRATION.md)

---

## Error reference

| Status | Meaning |
|---|---|
| `400` | Validation error (missing field, bad enum value, file too large) |
| `401` | Missing or invalid `x-api-key` header |
| `404` | Job not found in queue |
| `409` | Job exists but not yet `COMPLETED` |
| `413` | PDF exceeds 5 MB |
| `429` | Worker rate limit reached |
| `500` | Internal error — check service logs |

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 / TypeScript 5 |
| Queue | BullMQ 5 + Redis 7 |
| Database | PostgreSQL 16 + Prisma 7 |
| AI | OpenAI SDK (`gpt-4o-mini`) |
| PDF | pdf-parse 2 |
| WebSocket | Socket.IO 4 |
| Testing | Jest 30 + Supertest |
| Container | Docker (Node 22 Alpine) |
| CI | GitHub Actions |
