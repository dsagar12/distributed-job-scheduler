# Database Design & PostgreSQL Optimization

## 1. Relational Schema & Entities

The relational database is PostgreSQL 16 managed via Prisma ORM.

### Key Entities
1. **`User` & `Organization` & `Project`**:
   - Multi-tenant tenant hierarchy: Users &rarr; Organization Memberships &rarr; Organizations &rarr; Projects.
   - Enforces cryptographic project isolation (`projectId`).
2. **`Queue`**:
   - Priority-ranked queues with optional `concurrencyLimit`, `rateLimitPerSecond`, `defaultTimeoutMs`, and pause/resume flags.
3. **`Job`**:
   - Authoritative job state machine (`QUEUED`, `CLAIMED`, `RUNNING`, `COMPLETED`, `FAILED`, `SCHEDULED`, `DEAD_LETTER`, `CANCELLED`).
   - Includes cryptographic `leaseToken`, `leaseUntil`, `assignedWorkerId`, `attempt`, `maxAttempts`, and `idempotencyKey`.
4. **`JobExecution`**:
   - Immutable audit trail recording each attempt's start time, finish time, duration, status, worker ID, error, stack trace, and result payload.
5. **`DeadLetterJob`**:
   - Quarantined failed jobs with reason, attempt breakdown, and reprocess tracking.
6. **`Worker` & `WorkerHeartbeat`**:
   - Worker registration, concurrency, active job count, CPU/Memory telemetry samples.
7. **`ScheduledJob`**:
   - Recurring cron expressions, timezone, next run timestamps, and execution counts.
8. **`Batch`**:
   - Aggregated parent batch tracker with total, completed, and failed counts.

---

## 2. High-Performance SQL Indexing Strategy

### A. Atomic Claim Runnable Index
```sql
CREATE INDEX idx_jobs_claim_runnable 
ON jobs (queue_id, status, priority DESC, run_at ASC) 
WHERE status = 'QUEUED';
```
- **Rationale**: Partial B-Tree index covering only runnable jobs. Enables sub-millisecond index scans during `SELECT ... FOR UPDATE SKIP LOCKED` without scanning non-runnable or completed jobs.

### B. Expired Lease Sweeper Index
```sql
CREATE INDEX idx_jobs_expired_leases 
ON jobs (lease_until) 
WHERE status IN ('CLAIMED', 'RUNNING') AND lease_until IS NOT NULL;
```
- **Rationale**: Partial index for the scheduler's sweep loop. Allows instant identification of expired jobs without a sequential table scan.

### C. Project Idempotency Constraint
```sql
CREATE UNIQUE INDEX uq_jobs_project_idempotency_key 
ON jobs (project_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```
- **Rationale**: Prevents duplicate job creation within a tenant project across concurrent REST API requests.

---

## 3. Atomic Claim Query Execution Plan

```sql
WITH active_count AS (
  SELECT COUNT(*)::int AS active
  FROM jobs
  WHERE queue_id = $1::uuid
    AND status IN ('CLAIMED', 'RUNNING')
),
slots_available AS (
  SELECT GREATEST(0, $2::int - active) AS available
  FROM active_count
),
eligible_jobs AS (
  SELECT j.id
  FROM jobs j, slots_available sa
  WHERE ($2::int <= 0 OR sa.available > 0)
    AND j.queue_id = $1::uuid
    AND j.status = 'QUEUED'
    AND j.run_at <= NOW()
  ORDER BY j.priority DESC, j.run_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT CASE
    WHEN $2::int <= 0 THEN $3::int
    ELSE LEAST($3::int, (SELECT available FROM slots_available))
  END
)
UPDATE jobs j
SET status = 'CLAIMED',
    assigned_worker_id = $4,
    claimed_at = NOW(),
    lease_until = NOW() + ($5 || ' milliseconds')::interval,
    lease_token = gen_random_uuid()::text,
    attempt = j.attempt + 1,
    updated_at = NOW()
FROM eligible_jobs
WHERE j.id = eligible_jobs.id
RETURNING j.*;
```
