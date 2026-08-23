# Distributed Job Scheduler

A production-grade distributed background job scheduling and execution platform engineered for high concurrency, atomic job claiming, cryptographic lease fencing, resilient crash recovery, and advanced operational observability.

---

## 🌟 Key System Highlights

- **Authoritative Source of Truth:** PostgreSQL 16 guarantees persistent state, relational integrity, and strict ACID transaction safety. Redis 7 is used purely for ephemeral coordination and Pub/Sub event broadcasting.
- **Contention-Free Atomic Claiming:** Clustered workers poll PostgreSQL utilizing `SELECT ... FOR UPDATE SKIP LOCKED`, preventing double-execution without bottlenecking locks.
- **Distributed Lease Fencing:** Every claim generates a unique UUID `leaseToken`. All mutations assert `WHERE lease_token = $token`, making the system immune to zombie worker split-brain updates.
- **Partial Unique Index Idempotency:** Atomic deduplication via PostgreSQL index `(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
- **Strict Lifecycle State Machine:** Finite transitions from `SCHEDULED` &rarr; `QUEUED` &rarr; `CLAIMED` &rarr; `RUNNING` &rarr; `COMPLETED` / `FAILED` / `DEAD_LETTER`.
- **Immutable Execution History & Logs:** Every execution attempt generates a distinct `JobExecution` record and append-only `JobLog` stream.
- **Configurable Backoff & Retries:** Fixed, linear, and exponential backoff with full jitter to avoid thundering herds.
- **Autonomous Scheduler Daemon:** Evaluates recurring cron schedules, delayed jobs, and recovers stuck leases independently from API and worker nodes.

---

## 🚀 Production Differentiators

1. **⚡ Chaos Engineering Console (`/chaos`)**:
   - In-app fault injection laboratory.
   - Simulate lease expiration by backdating timestamps to test distributed fencing.
   - Simulate worker process crashes / heartbeat freezes.
   - Force in-flight task failures to observe retry cycles and DLQ transitions.
   - On-demand recovery sweeper triggers with a live audit timeline.

2. **🧠 AI Failure Investigator (`/investigator`)**:
   - Automated root-cause analysis engine that parses execution stack traces and logs.
   - Categorizes failures (`TIMEOUT_DEADLINE`, `RATE_LIMIT_429`, `DATABASE_LOCK_TIMEOUT`, `UPSTREAM_5XX`, `RESOURCE_EXHAUSTION`, `SERIALIZATION_ERROR`).
   - Identifies recurring failure patterns and outputs actionable architectural remediation recommendations.
   - **Safety Invariant**: Strictly read-only; AI can never mutate job status or state transitions directly.

3. **📊 Queue Load Simulator**:
   - Generates synthetic load bursts (10 to 1,000 jobs) with configurable priority curves (`Balanced`, `High Bias`, `Random`) and error rates.
   - Displays real-time throughput, queue depth, and latency from authoritative PostgreSQL and worker metrics.

4. **🕒 Visual Job Execution Timeline**:
   - Embedded interactive breadcrumb timeline in the dashboard inspector showing the progression from `CREATED` &rarr; `QUEUED` &rarr; `CLAIMED` &rarr; `RUNNING` &rarr; `TERMINAL STATE`, including worker IDs, lease tokens, and attempt counts.

---

## 📁 Monorepo Layout

```
distributed-job-scheduler/
├── apps/
│   ├── api/          # NestJS API Gateway (Auth, Queues, Jobs, Batches, DLQ, Chaos, Investigator, Simulator)
│   ├── worker/       # Clustered Worker Daemon (Atomic SKIP LOCKED execution & lease watchdogs)
│   ├── scheduler/    # Dedicated Cron, Delayed & Lease Recovery Daemon
│   └── dashboard/    # React 18 + Vite + Tailwind Developer Dashboard (Chaos Lab, AI Investigator)
├── packages/
│   ├── database/     # Prisma ORM, raw PostgreSQL repositories & custom SQL indexes
│   ├── shared/       # Backoff math, cron utilities, structured JSON logger
│   └── types/        # Domain models, enums, DTOs, and event contracts
├── tests/
│   ├── unit/         # 27 Unit tests (State machine, cron helper, retry calculator, AI analyzer)
│   ├── integration/  # 22 Integration tests (Lease fencing, crash recovery, DLQ, chaos, simulator)
│   └── concurrency/  # 1 High-concurrency stress test (50 workers, 1000 jobs, 0 duplicate claims)
├── docs/             # Complete architectural documentation, ER diagram, differentiators & API specs
├── docker/           # Production-ready multi-stage Dockerfiles & Postgres setup
└── docker-compose.yml
```

---

## ⚡ Quick Start (Docker Compose)

The entire distributed cluster can be booted with a single command:

```bash
# Boot full cluster
docker compose up -d

# Check cluster services status
docker compose ps

# Follow logs across all nodes
docker compose logs -f
```

### Access URLs
- **Developer Dashboard**: `http://localhost:5173`
- **REST API Gateway**: `http://localhost:3000/api/v1`
- **Swagger OpenAPI Docs**: `http://localhost:3000/docs`
- **Health Check Probe**: `http://localhost:3000/api/v1/health`

---

## 🧪 Automated Test Verification

All test suites can be executed across the monorepo:

```bash
# Run all Unit Tests (27 tests)
npm run test:unit

# Run Integration Tests (22 tests)
npm run test:integration

# Run High-Concurrency Stress Test (50 Workers, 1,000 Jobs, 0 Duplicate Claims)
npm run test:concurrency
```

**Grand Total: 50 / 50 Passing Tests (100%)**

---

## 📚 Architectural Documentation

- **[Differentiating Architectural Layers](docs/DIFFERENTIATORS.md)** 🌟
- **[Final Review & Independent Verification](docs/FINAL_REVIEW.md)**
- **[System Architecture](docs/ARCHITECTURE.md)**
- **[Database Schema & Index Design](docs/DATABASE_DESIGN.md)**
- **[Worker Reliability & Concurrency](docs/WORKER_RELIABILITY.md)**
- **[Design Decisions & Trade-Offs](docs/DESIGN_DECISIONS.md)**
- **[REST API & WebSocket Reference](docs/API.md)**
- **[Deployment & Topology Guide](docs/DEPLOYMENT.md)**
