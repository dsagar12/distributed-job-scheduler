# Distributed Job Scheduler - Deployment & Operations Guide

## Production Topology

The system is deployed as containerized microservices running against **PostgreSQL 16** (authoritative storage) and **Redis 7** (ephemeral coordination):

```
┌────────────────────────────────────────────────────────┐
│                   Reverse Proxy / Ingress               │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
        ┌───────▼────────┐       ┌───────▼────────┐
        │  React SPA UI  │       │  NestJS API    │
        │ (Port 5173/80) │       │  (Port 3000)   │
        └────────────────┘       └───────┬────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
┌───────▼────────┐               ┌───────▼────────┐               ┌───────▼────────┐
│ Worker Node 1  │               │ Worker Node 2  │               │ Scheduler Lead │
│ (Concurrency=5)│               │ (Concurrency=5)│               │ (Cron/Recovery)│
└───────┬────────┘               └───────┬────────┘               └───────┬────────┘
        │                                │                                │
        └────────────────┬───────────────┴────────────────────────────────┘
                         │
        ┌────────────────┴───────────────┐
        │                                │
┌───────▼────────┐               ┌───────▼────────┐
│ PostgreSQL 16  │               │ Redis 7        │
│ (SKIP LOCKED)  │               │ (PubSub Cache) │
└────────────────┘               └────────────────┘
```

---

## 1. Quick Start with Docker Compose

To boot the complete distributed cluster (PostgreSQL, Redis, API, Worker Fleet, Scheduler Daemon, and React Dashboard):

```bash
# Boot all services in background
docker compose up -d

# Inspect status of all cluster nodes
docker compose ps

# Follow logs
docker compose logs -f
```

### Accessing Services
- **Developer Dashboard**: `http://localhost:5173`
- **REST API Gateway**: `http://localhost:3000/api/v1`
- **Swagger OpenAPI**: `http://localhost:3000/docs`
- **Health Check Probe**: `http://localhost:3000/api/v1/health`

---

## 2. Running Locally for Development

### Prerequisites
- Node.js >= 20.x
- PostgreSQL 16
- Redis 7

### Step 1: Install Dependencies & Build
```bash
npm install
npm run build
```

### Step 2: Database Migration & Seeding
```bash
npm run db:migrate
npm run db:seed
```

### Step 3: Start Services in Separate Terminals
```bash
# Terminal 1: API Gateway
npm run dev:api

# Terminal 2: Scheduler Daemon
npm run dev:scheduler

# Terminal 3: Worker Node 1
npm run dev:worker

# Terminal 4: React Dashboard
npm run dev:dashboard
```

---

## 3. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://scheduler_user:...@localhost:5432/distributed_job_scheduler` | PostgreSQL authoritative connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis ephemeral cache & Pub/Sub URL |
| `PORT` | `3000` | API Gateway HTTP port |
| `JWT_SECRET` | `super_secret_jwt_signing_key_...` | JWT access token signature key |
| `WORKER_ID` | `worker-node-1` | Unique worker instance identifier |
| `WORKER_CONCURRENCY` | `5` | Maximum concurrent leased jobs per worker |
| `SCHEDULER_POLL_INTERVAL_MS` | `1000` | Cron and delayed job evaluation frequency |
| `SCHEDULER_RECOVERY_INTERVAL_MS` | `5000` | Expired lease crash recovery frequency |

---

## 4. Horizontal Scaling of Worker Fleet

Workers are completely stateless execution nodes. To scale out to 10 worker nodes in Docker Compose:
```bash
docker compose up -d --scale worker-1=5 --scale worker-2=5
```
Each worker node registers with the database, generates its own unique ID, begins polling `SELECT ... FOR UPDATE SKIP LOCKED` without central bottleneck, and renews leases via heartbeat timers.
