# Implementation Roadmap & Engineering Phases

This roadmap guides the phase-by-phase development of the Distributed Job Scheduler platform.

---

## Phase 1: Architecture & Repository Foundation (CURRENT)
- [x] Initial Monorepo setup (npm workspaces for `apps/*` and `packages/*`)
- [x] Strict TypeScript configuration and path aliases
- [x] Core domain enums, type definitions, and DTO contracts (`@scheduler/types`)
- [x] Shared backoff mathematics (fixed, linear, exponential + jitter), cron helpers, structured logger (`@scheduler/shared`)
- [x] Docker compose infrastructure (PostgreSQL 16, Redis 7, Multi-worker network)
- [x] PostgreSQL database initialization script (`docker/postgres/init.sql`)
- [x] Comprehensive architectural documentation in `/docs`
- [x] Unit test suite for backoff logic

---

## Phase 2: PostgreSQL Schema & Prisma Relational Layer
- [ ] Define complete Prisma schema with UUIDs, foreign keys, enums, composite unique constraints, and partial indexes:
  - `User`, `Organization`, `OrganizationMember`, `Project`, `Queue`, `RetryPolicy`, `Job`, `JobExecution`, `JobLog`, `Worker`, `WorkerHeartbeat`, `ScheduledJob`, `DeadLetterJob`, `Batch`, `BatchJob`
- [ ] Generate Prisma migrations and PostgreSQL index scripts
- [ ] Implement database client and atomic SKIP LOCKED query repositories in `@scheduler/database`
- [ ] Seed script for local development (sample organization, projects, default queues, and retry policies)

---

## Phase 3: NestJS API Gateway & Authentication
- [ ] User authentication with JWT access tokens and secure refresh token rotation
- [ ] Bcrypt password hashing
- [ ] Organization & Project management module
- [ ] Queue CRUD & control endpoints (Pause, Resume, Configure concurrency limit)
- [ ] Job ingestion REST endpoints (`POST /api/v1/jobs`, `POST /api/v1/batches`)
- [ ] Idempotency key handling
- [ ] OpenAPI (Swagger) documentation integration

---

## Phase 4: Worker Engine & Atomic Job Claiming
- [ ] Dynamic queue polling engine with bounded concurrency
- [ ] Atomic job claiming using `SELECT ... FOR UPDATE SKIP LOCKED`
- [ ] Transaction isolation and safe state transition to `CLAIMED` and `RUNNING`
- [ ] Concurrent worker execution pool
- [ ] Execution sandbox with timeout management and exception trapping

---

## Phase 5: Heartbeats, Leases, and Crash Recovery
- [ ] Worker heartbeat loop with periodic lease renewal
- [ ] Worker registration and health telemetry in Redis & PostgreSQL
- [ ] Graceful shutdown hooks (`SIGINT`/`SIGTERM`) with job draining
- [ ] Dead worker detection and expired lease recovery sweeper

---

## Phase 6: Retries, Backoff, Execution History & DLQ
- [ ] Retry backoff execution engine (FIXED, LINEAR, EXPONENTIAL with jitter)
- [ ] Independent `JobExecution` recording for every execution attempt
- [ ] Structured `JobLog` collection during execution
- [ ] Dead Letter Queue (DLQ) ingestion when retries are exhausted
- [ ] DLQ inspection, replay/reprocess REST endpoints

---

## Phase 7: Dedicated Scheduler Daemon (Cron, Delayed, Recurring & Batches)
- [ ] Standalone Scheduler process
- [ ] Delayed job promotion (`SCHEDULED` -> `QUEUED`)
- [ ] Cron schedule evaluation and automated `Job` record generation
- [ ] Batch processing coordinator and completion tracking

---

## Phase 8: Observability, Metrics & Health Checks
- [ ] Structured JSON logging with trace context (`jobId`, `workerId`, `executionId`, `queueId`)
- [ ] Metrics collection: queue depths, throughput/min, failure rates, duration percentiles (P50, P95, P99)
- [ ] Health check endpoints (`/health/live`, `/health/ready`)

---

## Phase 9: React Infrastructure Dashboard
- [ ] Modern dark-themed dashboard UI (React 18 + Vite + Tailwind + Lucide)
- [ ] Real-time cluster overview (Queue depths, Worker fleet health, System status)
- [ ] Interactive Queue manager & controls (Pause/Resume, Concurrency configuration)
- [ ] Job explorer with status filtering, search, pagination, and execution timeline
- [ ] Detailed Job inspector (Payload, Result, Execution History, Logs)
- [ ] Dead Letter Queue interface with one-click reprocess

---

## Phase 10: Live WebSocket Updates, RBAC & Rate Limiting
- [ ] WebSocket gateway in NestJS broadcasting lifecycle events via Redis Pub/Sub
- [ ] Real-time UI live feeds without polling
- [ ] Role-Based Access Control (Owner, Admin, Member, Viewer)
- [ ] Per-queue rate limiting using Redis token bucket

---

## Phase 11: Workflow DAG Dependencies & AI Summaries (Bonus)
- [ ] Job dependency graph (DAG) execution (parent/child relationships)
- [ ] AI-generated failure diagnostics and remediation suggestions

---

## Phase 12: Rigorous Testing Suite
- [ ] Concurrency testing: 50 simulated workers claiming 1,000 jobs simultaneously
- [ ] Failure simulation testing: Hard worker process kill during active execution -> lease expiry -> automatic claim by another worker
- [ ] End-to-end integration tests
- [ ] Load and performance benchmarks

---

## Phase 13: Final Polish & Production Documentation
- [ ] Multi-container Docker Compose verification
- [ ] Comprehensive README, architecture diagrams, and submission documentation
