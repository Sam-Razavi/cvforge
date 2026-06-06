# CVForge — ApplyLuma Integration Guide

CVForge is a stateless async microservice. ApplyLuma enqueues a CV-rewrite job,
polls for completion via WebSocket, and fetches the result. The service never
stores credentials — all state is in Postgres/Redis.

## Base URL

```
https://<your-railway-app>.railway.app
```

## Authentication

Every request to `/rewrite` and `/jobs/*` must include:

```
x-api-key: cvf_<hex-string>
```

To create a key, run once against the production database:

```bash
node scripts/create-api-key.mjs "applyluma-prod"
```

The plaintext key is printed once and never stored. Save it to
`APPLYLUMA_CV_API_KEY` in your Vercel environment.

---

## REST Endpoints

### POST /rewrite

Enqueues an async rewrite job.

**Content-Type**: `multipart/form-data` (PDF upload) **or** `application/json` (raw text).

| Field | Type | Required | Notes |
|---|---|---|---|
| `cv` | file | no* | PDF ≤ 5 MB |
| `cvText` | string | no* | Plain-text CV (≤ 50 000 chars) |
| `jobDescription` | string | yes | ≤ 10 000 chars |
| `language` | `"en"` \| `"sv"` | no | Default `"en"` |
| `tone` | `"professional"` \| `"confident"` \| `"concise"` | no | Default `"professional"` |
| `priority` | integer 1-10 | no | Lower = higher priority. Default `5` |

*Either `cv` (PDF) or `cvText` must be provided, not both.

**Example — PDF upload**

```ts
const form = new FormData();
form.append('cv', pdfBlob, 'resume.pdf');
form.append('jobDescription', jobDescriptionText);
form.append('language', 'en');

const res = await fetch(`${CVFORGE_URL}/rewrite`, {
  method: 'POST',
  headers: { 'x-api-key': process.env.APPLYLUMA_CV_API_KEY },
  body: form,
});
const { jobId, recordId } = await res.json();
// jobId  — BullMQ queue ID (used for WebSocket subscription)
// recordId — Postgres record ID (used to fetch the final result)
```

**Example — plain text**

```ts
const res = await fetch(`${CVFORGE_URL}/rewrite`, {
  method: 'POST',
  headers: {
    'x-api-key': process.env.APPLYLUMA_CV_API_KEY,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ cvText, jobDescription, tone: 'confident' }),
});
```

**Response 201**

```json
{
  "jobId": "42",
  "recordId": "018f1b3a-...",
  "status": "queued",
  "position": 3
}
```

---

### GET /jobs/:jobId

Returns current queue state (not the DB record).

```ts
const { status, progress } = await fetch(`${CVFORGE_URL}/jobs/${jobId}`, {
  headers: { 'x-api-key': process.env.APPLYLUMA_CV_API_KEY },
}).then(r => r.json());
// status: "waiting" | "active" | "completed" | "failed"
// progress: { stage: "rewriting", percent: 40 }
```

---

### GET /jobs/:recordId/result

Returns the finished output. Returns **409** if the job is not yet complete.

```ts
const result = await fetch(`${CVFORGE_URL}/jobs/${recordId}/result`, {
  headers: { 'x-api-key': process.env.APPLYLUMA_CV_API_KEY },
}).then(r => r.json());
```

**Response 200**

```json
{
  "rewrittenCv":  "...",
  "coverLetter":  "...",
  "matchScore":   87,
  "keywordsAdded": ["TypeScript", "CI/CD", "Agile"]
}
```

---

## Real-time Progress via WebSocket

CVForge uses Socket.IO. Subscribe immediately after enqueueing so no event is
missed.

```ts
import { io } from 'socket.io-client';

const socket = io(CVFORGE_URL, { transports: ['websocket'] });

socket.emit('subscribe', { jobId });

socket.on('progress', ({ stage, percent }) => {
  // stage: "extracting" | "rewriting" | "cover_letter" | "scoring" | "done"
  // percent: 10 | 40 | 70 | 90 | 100
  updateProgressBar(percent);
});

socket.on('completed', (result) => {
  // result has the same shape as GET /jobs/:recordId/result
  displayResult(result);
  socket.disconnect();
});

socket.on('failed', ({ error }) => {
  showError(error);
  socket.disconnect();
});
```

---

## Recommended Integration Flow

```
User submits CV + JD
        │
        ▼
POST /rewrite  ──────►  { jobId, recordId }
        │
        ├── socket.emit('subscribe', { jobId })
        │
        │   [progress events update UI]
        │
        └── socket.on('completed') ──► display result
               OR
            socket.on('failed')   ──► show error
               OR
            fallback: poll GET /jobs/:recordId/result every 5 s
```

**Fallback polling** (if WebSocket is unavailable):

```ts
async function pollResult(recordId: string, intervalMs = 5000): Promise<Result> {
  while (true) {
    const res = await fetch(`${CVFORGE_URL}/jobs/${recordId}/result`, {
      headers: { 'x-api-key': process.env.APPLYLUMA_CV_API_KEY },
    });
    if (res.status === 200) return res.json();
    if (res.status !== 409) throw new Error(`Unexpected status ${res.status}`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}
```

---

## Error Reference

| Status | Meaning |
|---|---|
| 400 | Validation failure (missing field, bad enum, file too large) |
| 401 | Missing or invalid `x-api-key` header |
| 404 | Job not found in queue (use `recordId` for result, `jobId` for status) |
| 409 | Job exists but is not yet `COMPLETED` |
| 413 | PDF exceeds 5 MB limit |
| 429 | Worker rate limit hit (20 jobs/min) |
| 500 | Internal error — check CVForge logs |

---

## Environment Variables (ApplyLuma side)

```bash
CVFORGE_URL=https://<railway-app>.railway.app
APPLYLUMA_CV_API_KEY=cvf_<hex-string>
```
