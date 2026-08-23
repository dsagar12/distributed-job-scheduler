# Architectural & Engineering Design Decisions

This document records the foundational engineering design decisions made in the Distributed Job Scheduler platform.

---

## 1. PostgreSQL as the Authoritative Source of Truth vs. Redis

### Decision:
PostgreSQL 16 is selected as the sole authoritative source of truth for all persistent entities, state machine transitions, execution traces, retry histories, and logs. Redis 7 is used exclusively for ephemeral coordination (fast heartbeat caching, WebSocket event distribution via Pub/Sub, and rate limiting).

### Rationale:
- **ACID Transactions:** PostgreSQL transactions provide atomic claiming, lease assignment, and execution trace creation within a single isolation boundary.
- **Data Durability:** Redis in-memory storage, even with AOF/RDB persistence, presents data loss risks during failovers.
- **Relational Integrity:** Foreign keys (with `ON DELETE RESTRICT` on Projects/Queues to protect active jobs) ensure strict referential integrity.
- **Resilience:** If Redis becomes temporarily unavailable or crashes, the core scheduler, worker execution, retries, and database state transitions continue running without interruption.

---

## 2. Atomic Job Claiming via `SELECT ... FOR UPDATE SKIP LOCKED`

### Decision:
Job claiming is implemented in a single PostgreSQL query using `SELECT ... FOR UPDATE SKIP LOCKED` combined with an `UPDATE ... FROM` clause.

### Rationale:
- **Lock Contention Elimination:** `SKIP LOCKED` instructs PostgreSQL to skip any rows currently locked by other concurrent worker transactions rather than waiting. This eliminates deadlocks and contention bottlenecks across dozens of parallel worker nodes.
- **Queue Concurrency Bounding:** The claiming query calculates active in-flight jobs in the queue (`CLAIMED` + `RUNNING`) and dynamic available capacity directly in SQL CTEs, guaranteeing that queue-level concurrency limits cannot be violated even under extreme concurrency.
- **Zero Race Conditions:** The transition from `QUEUED` to `CLAIMED` happens atomically with lease timestamp generation, lease fencing token creation, and attempt counter incrementation.

---

## 3. Lease Fencing Tokens for Zombie Worker Protection

### Decision:
Every job claim generates a cryptographically unique `lease_token` (UUID v4) alongside `lease_until` and `assigned_worker_id`. All worker operations (`startJobExecution`, `renewLease`, `completeJob`, `failJob`, `timeoutJob`) strictly check `assigned_worker_id` AND `lease_token` in their `WHERE` clauses.

### Rationale:
- In distributed environments, workers can experience GC pauses, network partitions, or CPU starvation causing leases to expire.
- If Worker 1 loses its lease and Worker 2 reclaims the job with a new `lease_token`, Worker 1's subsequent completion or failure write will match 0 rows.
- Worker 1 detects the fencing violation, stops mutating state, and avoids split-brain corruption.

---

## 4. Idempotency Key Strategy with PostgreSQL Partial Unique Index

### Decision:
Job idempotency is enforced at the database level using `(project_id, idempotency_key)` with a PostgreSQL partial unique index:
```sql
CREATE UNIQUE INDEX uq_jobs_project_idempotency_key 
ON jobs (project_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

### Rationale:
- Standard unique constraints in Prisma or SQL would treat `NULL` values either as distinct (in Postgres) or conflict across multiple jobs without keys.
- The partial index ensures that jobs *with* an idempotency key within the same project are strictly unique, while allowing unlimited jobs with `NULL` idempotency keys.
- Application-level deduplication catches the unique constraint violation in a race and returns the existing job entity safely.

---

## 5. Non-Destructive Execution History (`JobExecution` and `JobLog`)

### Decision:
Every execution attempt produces an independent `JobExecution` row. Historical attempts and logs are never overwritten.

### Rationale:
- Full observability requires knowing the exact failure reasons, stack traces, durations, and worker nodes of previous attempts.
- When jobs are retried or reprocessed from the DLQ, previous attempts remain intact, and new attempts increment `attempt`.

---

## 6. Deterministic Retry Backoff with Jitter

### Decision:
Retries support `FIXED`, `LINEAR`, and `EXPONENTIAL` backoff strategies with deterministic delay calculations, configurable `maxDelayMs` capping, and decorrelated jitter.

### Rationale:
- Exponential backoff with jitter prevents the "thundering herd" problem when downstream systems recover from transient outages.
- Linear and fixed strategies support predictable scheduling for specialized queue requirements.

---

## 7. Discrete Job Creation for Recurring Cron Schedules

### Decision:
Recurring cron schedules are stored as definitions in `scheduled_jobs`. When a cron interval elapses, the Scheduler creates a discrete, independent `Job` record in `jobs` with an idempotency key `schedule:<id>:<isoTimestamp>`.

### Rationale:
- Mutating a single row to represent infinite recurring executions destroys execution history, metrics, and prevents per-job retries.
- Discrete job records enable standard worker claiming, distinct logging, timeout enforcement, and retry policies for every cron trigger.

---

## 8. Graceful Worker Draining Protocol

### Decision:
Workers listen for `SIGINT` / `SIGTERM` signals, transition status to `DRAINING`, cease queue polling, and wait for in-flight tasks to complete within a bounded shutdown window (`WORKER_SHUTDOWN_TIMEOUT_MS`).

### Rationale:
- Prevents in-flight jobs from being aborted mid-execution during deployments or scaling events.
- If the graceful timeout expires, active jobs are cleanly released back to `QUEUED` or swept by the crash recovery daemon.
