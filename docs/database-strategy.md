# PostgreSQL Database Strategy & Access Patterns

## 1. Core Architectural Principle

**PostgreSQL is the single authoritative source of truth.** All state transitions, lease acquisitions, retry counters, execution histories, and logs are persisted to PostgreSQL with strict relational integrity, UUID primary keys, and foreign key cascades.

---

## 2. Critical Access Patterns & Indexing Strategy

Indexes are purpose-built for the high-frequency query paths of the distributed engine:

### Pattern 1: Atomic Job Claiming (Highest Frequency)
**Query Pattern:**
```sql
SELECT id, queue_id, payload, timeout_ms, attempt, max_attempts, retry_policy_id
FROM jobs
WHERE queue_id = $1
  AND status = 'QUEUED'
  AND run_at <= NOW()
ORDER BY priority DESC, run_at ASC
FOR UPDATE SKIP LOCKED
LIMIT $limit;
```
**Index Requirement:**
```sql
CREATE INDEX idx_jobs_claim_runnable 
ON jobs (queue_id, priority DESC, run_at ASC)
WHERE status = 'QUEUED';
```
*Rationale:* 
1. `WHERE status = 'QUEUED'` partial filter restricts the index solely to active runnable rows.
2. `queue_id` filters immediately to the target queue.
3. `(priority DESC, run_at ASC)` matches the `ORDER BY` clause directly. PostgreSQL walks the pre-sorted index branch, filters for `run_at <= NOW()`, and terminates immediately upon finding `LIMIT` rows, completely eliminating in-memory sorting (`Sort Method: None`).

---

### Pattern 2: Expired Lease Recovery (Sweeper)
**Query Pattern:**
```sql
SELECT id, attempt, max_attempts, queue_id, assigned_worker_id, lease_token
FROM jobs
WHERE status IN ('CLAIMED', 'RUNNING')
  AND lease_until < NOW()
FOR UPDATE SKIP LOCKED;
```
**Index Requirement:**
```sql
CREATE INDEX idx_jobs_expired_leases
ON jobs (lease_until)
WHERE status IN ('CLAIMED', 'RUNNING');
```
*Rationale:* Partial index on active execution statuses drastically minimizes scan range to only active jobs with overdue leases.

---

### Pattern 3: Scheduled & Recurring Job Progression
**Query Pattern:**
```sql
SELECT id, cron_expression, timezone, payload, queue_id, project_id
FROM scheduled_jobs
WHERE status = 'ACTIVE'
  AND next_run_at <= NOW()
FOR UPDATE SKIP LOCKED;
```
**Index Requirement:**
```sql
CREATE INDEX idx_scheduled_jobs_due
ON scheduled_jobs (status, next_run_at)
WHERE status = 'ACTIVE';
```

---

### Pattern 4: Execution History & Logs Retrieval
**Query Pattern:**
```sql
SELECT * FROM job_executions WHERE job_id = $jobId ORDER BY attempt ASC;
SELECT * FROM job_logs WHERE job_id = $jobId ORDER BY timestamp ASC;
```
**Index Requirements:**
```sql
CREATE INDEX idx_job_executions_job_attempt ON job_executions (job_id, attempt);
CREATE INDEX idx_job_logs_job_timestamp ON job_logs (job_id, timestamp);
```

---

### Pattern 5: Queue Metrics & Statistics
**Query Pattern:**
```sql
SELECT status, count(*) 
FROM jobs 
WHERE queue_id = $queueId 
GROUP BY status;
```
**Index Requirement:**
```sql
CREATE INDEX idx_jobs_queue_status ON jobs (queue_id, status);
```

---

### Pattern 6: Idempotency Verification
**Query Pattern:**
```sql
SELECT id, status, result FROM jobs WHERE project_id = $projectId AND idempotency_key = $key;
```
**Index Requirement:**
```sql
CREATE UNIQUE INDEX uq_jobs_project_idempotency_key 
ON jobs (project_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

---

### Pattern 7: Historical Worker Telemetry Retention Sweeper
**Query Pattern:**
```sql
DELETE FROM worker_heartbeats 
WHERE timestamp < NOW() - INTERVAL '30 days';
```
**Index Requirement:**
```sql
CREATE INDEX idx_worker_heartbeats_timestamp 
ON worker_heartbeats (worker_id, timestamp DESC);
```
*Rationale:* Enables fast time-series range lookups for dashboard charts and rapid periodic pruning of historical samples older than the 7-day or 30-day retention window.

---

## 3. Entity Relationships Summary

- **Organization** 1 — N **OrganizationMember** N — 1 **User**
- **Organization** 1 — N **Project** (Protected with `ON DELETE RESTRICT`)
- **Project** 1 — N **Queue** (Protected with `ON DELETE RESTRICT`)
- **Project** 1 — N **RetryPolicy**
- **Project** 1 — N **Batch** 1 — N **BatchJob** N — 1 **Job**
- **Queue** 1 — N **Job** (Protected with `ON DELETE RESTRICT`)
- **Queue** 1 — N **ScheduledJob**
- **Queue** 1 — N **DeadLetterJob**
- **Queue** 1 — N **WorkerQueue** N — 1 **Worker** (Normalized many-to-many routing)
- **Job** 1 — N **JobExecution** (Preserves every attempt independently with lease fencing)
- **Job** 1 — N **JobLog** (Detailed runtime logs)
- **Worker** 1 — N **WorkerHeartbeat** (Time-series telemetry with 7/30 days retention)
