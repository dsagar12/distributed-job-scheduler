# System Architecture & Technical Specification

## 1. High-Level System Architecture

The **Distributed Job Scheduler** is a high-throughput, horizontally scalable distributed background execution platform designed for multi-tenant orchestration, bounded concurrency, sub-millisecond lease fencing, deterministic backoff retries, and high-fidelity observability.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 React 18 + Vite Dashboard               │
                  │   - Live Metrics, Jobs Explorer, DLQ, Cron Manager      │
                  └─────────────────────────┬───────────────────────────────┘
                                            │ HTTP / WebSocket (Socket.IO)
                                            ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                 NestJS REST API Gateway                 │
                  │   - Multi-tenant Isolation, JWT Auth & RBAC             │
                  │   - Swagger OpenAPI 3.0 Specs & Validation Pipes        │
                  └──────────────┬───────────────────────────┬──────────────┘
                                 │                           │
                   Authoritative │ Read/Write                │ Redis Events
                   SQL Tx        │                           │ (Pub/Sub)
                                 ▼                           ▼
                  ┌───────────────────────────┐    ┌────────────────────────┐
                  │   PostgreSQL 16 Database  │    │     Redis 7 Cluster    │
                  │ - FOR UPDATE SKIP LOCKED  │    │ - Pub/Sub Broadcasts   │
                  │ - Cryptographic Leases    │    │ - Fast Coordination    │
                  │ - Partial Unique Indexes  │    └────────────┬───────────┘
                  └──────────────┬────────────┘                 │
                                 │                              │
         ┌───────────────────────┴──────────────────────────────┴────────────────────────┐
         │                                                                              │
         ▼                                                                              ▼
┌─────────────────────────────────┐                                    ┌─────────────────────────────────┐
│     Worker Fleet Daemon(s)      │                                    │   Scheduler Daemon (Leader)     │
│ - Bounded Concurrency Pool      │                                    │ - Cron Schedule Evaluator       │
│ - Atomic Leased Claiming        │                                    │ - Expired Lease Sweeper         │
│ - AbortController Watchdogs     │                                    │ - Dead Worker Reconciler        │
│ - Deterministic Jitter Retries  │                                    │ - Historical Telemetry Pruner   │
└─────────────────────────────────┘                                    └─────────────────────────────────┘
```

---

## 2. Core Subsystems

### A. Authoritative Storage Engine (PostgreSQL)
- **Primary Source of Truth**: All transactional state (queues, jobs, executions, schedules, DLQ) lives in PostgreSQL.
- **Race-Condition-Free Claiming**: Uses `SELECT ... FOR UPDATE SKIP LOCKED` inside serializable/read-committed transactions to eliminate claim collisions across worker pools.
- **Lease Fencing Tokens**: Each claimed job receives a cryptographic `leaseToken` (UUIDv4) and `leaseUntil` timestamp. Any worker attempting to complete, fail, or renew a job whose lease expired is fenced and rejected.

### B. Worker Fleet Daemon (`apps/worker`)
- **Bounded Concurrency**: Workers maintain a bounded concurrency pool (`WORKER_CONCURRENCY`, default 10) to prevent CPU and memory exhaustion.
- **Timeout Watchdogs**: Every job execution is wrapped in an `AbortController` linked to the job's `timeoutMs` limit.
- **Non-Destructive Execution History**: Failed attempts append new rows to `JobExecution` without overwriting prior attempt traces.
- **Graceful Draining**: Catches `SIGINT` / `SIGTERM` to stop claiming new jobs while allowing active executions to finish before exiting.

### C. Autonomous Scheduler Daemon (`apps/scheduler`)
- **Recurring Cron Promotion**: Evaluates standard 5-part cron expressions with timezone support, calculating and scheduling next occurrence.
- **Stale Lease Recovery**: Periodically scans `jobs` stuck in `CLAIMED` or `RUNNING` past `leaseUntil`, promoting runnable attempts or archiving exhausted jobs to DLQ.
- **Dead Worker Sweeper**: Reconciles worker nodes that failed to emit a heartbeat within threshold.

### D. Observability & Developer Dashboard (`apps/dashboard`)
- **Full Real-time Console**: Live throughput charts, queue depth indicators, worker fleet metrics, DLQ inspection, and execution log streams.
- **Live Status Chip**: Real-time Socket.IO WebSocket indicator (`LIVE WS`).
