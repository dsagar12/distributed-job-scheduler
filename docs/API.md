# Distributed Job Scheduler - REST API & WebSocket Event Reference

## Base URL
- REST API: `http://localhost:3000/api/v1`
- Swagger OpenAPI Docs: `http://localhost:3000/docs`
- WebSocket Gateway: `ws://localhost:3000/events`

---

## Authentication & Headers

Requests must provide one of:
1. **JWT Bearer Token** in `Authorization: Bearer <token>`
2. **Project API Key** in `Authorization: Bearer <api_key>` or `x-api-key: <api_key>`

Tenant routing headers:
- `x-organization-id`: Target Organization UUID
- `x-project-id`: Target Project UUID

---

## Endpoints

### 1. Authentication (`/auth`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Create user account, default organization, and project |
| `POST` | `/auth/login` | Authenticate email & password, returns JWT tokens |
| `POST` | `/auth/refresh` | Exchange rotating refresh token for new access token |
| `GET` | `/auth/me` | Fetch authenticated user profile & memberships |

---

### 2. Queues Management (`/queues`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/queues?projectId=<id>` | List all queues for project with real-time metrics |
| `GET` | `/queues/:id` | Get queue configuration and metrics breakdown |
| `POST` | `/queues` | Create new queue with concurrency limits |
| `PUT` | `/queues/:id` | Update concurrency limit, timeout, or rate limit |
| `PATCH` | `/queues/:id/pause` | Pause job claiming on queue |
| `PATCH` | `/queues/:id/resume` | Resume job claiming on queue |
| `DELETE`| `/queues/:id` | Delete queue (must have 0 active jobs) |
| `GET` | `/queues/:id/metrics` | Fetch aggregated queue depth & latency metrics |

---

### 3. Jobs Management (`/jobs`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/jobs` | Enqueue a new background job |
| `GET` | `/jobs` | Filterable list with pagination (status, queue, search) |
| `GET` | `/jobs/:id` | Get job details, lease status, and result |
| `PATCH`| `/jobs/:id/cancel` | Cancel in-flight or queued job |
| `POST` | `/jobs/:id/reprocess` | Reset failed or DLQ job to QUEUED |
| `GET` | `/jobs/:id/executions` | Fetch all historical execution attempts & stack traces |
| `GET` | `/jobs/:id/logs` | Fetch live color-coded execution logs |

#### Enqueue Job Request Payload Example:
```json
{
  "projectId": "11111111-1111-1111-1111-111111111111",
  "queueId": "22222222-2222-2222-2222-222222222222",
  "name": "Send Invoice Email",
  "payload": {
    "recipient": "customer@acme.com",
    "invoiceId": "INV-2026-001"
  },
  "priority": 80,
  "timeoutMs": 30000,
  "maxAttempts": 3,
  "runAt": "2026-08-23T15:00:00.000Z",
  "idempotencyKey": "invoice-email-INV-2026-001"
}
```

---

### 4. Batch Workflows (`/batches`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/batches` | Atomically submit multiple jobs with collective tracking |
| `GET` | `/batches?projectId=<id>` | List batches with progress % and counts |
| `GET` | `/batches/:id` | Get batch status, progress, and child jobs list |

---

### 5. Dead Letter Queue (`/dlq`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/dlq?projectId=<id>` | List exhausted jobs in DLQ with error reasons |
| `GET` | `/dlq/:id` | Get detailed DLQ record with full stack trace |
| `POST` | `/dlq/:id/reprocess` | Reprocess DLQ job with extended attempt budget |
| `DELETE`| `/dlq/:id` | Resolve / purge record from DLQ |

---

### 6. Schedules & Recurring Cron (`/schedules`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/schedules` | Create recurring cron schedule |
| `GET` | `/schedules?projectId=<id>`| List recurring schedules with next run countdown |
| `GET` | `/schedules/:id` | Get schedule details |
| `PUT` | `/schedules/:id` | Update cron expression, timezone, or payload |
| `POST` | `/schedules/:id/trigger` | Trigger immediate on-demand execution |
| `DELETE`| `/schedules/:id` | Delete schedule |

---

### 7. Worker Fleet Telemetry (`/workers`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/workers` | List all registered worker nodes, status, and load |
| `GET` | `/workers/:id` | Get worker details with recent heartbeat history |

---

### 8. Metrics & Observability (`/metrics`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/metrics/overview` | Cluster health, total counts, P95/P99 latency |
| `GET` | `/metrics/timeline?hours=24`| Hourly throughput time-series (completed vs failed) |
| `GET` | `/metrics/queues` | Aggregated queue depths across project |
| `GET` | `/health` | System health check (PostgreSQL + Redis probes) |

---

## WebSocket Gateway Events (`/events`)

Connect to `ws://localhost:3000/events`.

### Client Subscriptions
- `subscribe:project` -> `projectId`
- `subscribe:queue` -> `queueId`

### Server Emitted Events
- `job:created`: Emitted when a new job is enqueued.
- `job:claimed`: Emitted when a worker claims a job with lease token.
- `job:completed`: Emitted when a job finishes successfully.
- `job:failed`: Emitted when a job execution fails.
- `job:dead_letter`: Emitted when retries are exhausted and job moves to DLQ.
- `worker:heartbeat`: Emitted periodically by worker nodes with memory/CPU telemetry.
