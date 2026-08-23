# Worker Reliability & Lease Management Strategy

## 1. The Distributed Worker Dilemma

In distributed background job processing, workers can fail unpredictably:
- Power loss / Node termination (OOM, VM preemption)
- Network partitions between worker and database
- Process hangs or infinite loops within a job payload
- Thread starvation or resource exhaustion

A robust system must guarantee:
1. **No Duplicate Execution in Normal Conditions:** Two healthy workers never execute the same job simultaneously.
2. **Crash Resilience (No Stuck Jobs):** If a worker dies mid-execution, the job is automatically recovered and retried.
3. **Graceful Draining:** On deployment or restart, workers finish in-flight jobs before terminating.

---

## 2. The Lease Mechanism with Fencing Tokens

Every running job is guarded by a time-bounded **Lease** and a unique cryptographic **Fencing Token**:
- `assigned_worker_id`: Identifier of the executing worker node.
- `lease_token`: Cryptographically unique UUID generated on every atomic claim (`gen_random_uuid()`).
- `claimed_at`: UTC timestamp of acquisition.
- `lease_until`: Expiration timestamp (`NOW() + WORKER_LEASE_DURATION_MS`).

### Why Fencing Tokens are Essential
In distributed computing, a worker W1 might experience a long Garbage Collection pause, OS thread starvation, or a transient network split. During this delay, W1's lease expires and Worker W2 claims the job, receiving a new `lease_token`. 
When W1 awakens, it attempts to complete the job. If the database only checked `assigned_worker_id`, W1 would overwrite W2's progress. 
With fencing tokens, W1's update uses:
```sql
WHERE id = $jobId 
  AND assigned_worker_id = $workerId 
  AND lease_token = $leaseToken 
  AND status = 'RUNNING';
```
Since W2 has a different `lease_token`, W1's update matches `0 rows`. W1 detects the fencing violation, aborts cleanly, and avoids split-brain data corruption.

### 2.1 Heartbeat Loop, Telemetry & Retention Strategy
The system maintains a clean separation between **hot worker state** and **historical heartbeat samples**:

1. **Hot Worker State (`Worker` Table & Redis):**
   - Represents the instant, real-time snapshot of the worker node.
   - Constantly updated in-place: `status`, `last_heartbeat_at`, `active_jobs_count`, `total_jobs_processed`, `total_jobs_failed`.
   - Redis key `scheduler:worker:heartbeat:$workerId` cached with a 10-second TTL for fast health checks.

2. **Historical Heartbeat Samples (`WorkerHeartbeat` Table):**
   - Time-series sample recorded periodically (e.g. every 15–30 seconds).
   - Captures `cpu_percent`, `memory_usage_mb`, `active_jobs_count`, `active_job_ids`, and `timestamp`.
   - Used for observability charts, worker utilization graphs, and trend analysis in the dashboard.

3. **Telemetry Retention Policy (7 / 30 Days):**
   - To prevent unbounded time-series storage growth, `WorkerHeartbeat` records are subject to a configurable retention policy (e.g., 7 days in development, 30 days in production).
   - An automated background retention sweeper in the Scheduler daemon purges records where `timestamp < NOW() - INTERVAL '30 days'`:
     ```sql
     DELETE FROM worker_heartbeats WHERE timestamp < NOW() - INTERVAL '30 days';
     ```

### 2.2 Lease Extension & Atomic Query
While a worker is actively processing a job:
1. A background timer fires every `WORKER_HEARTBEAT_INTERVAL_MS` (e.g. every 3 seconds).
2. The worker sends a heartbeat renewing its `lease_until` in PostgreSQL:
   ```sql
   UPDATE jobs
   SET lease_until = NOW() + INTERVAL '15 seconds'
   WHERE id = $jobId AND assigned_worker_id = $workerId AND status = 'RUNNING';
   ```
3. Updates hot worker state in `Worker` table and Redis.

### 2.2 Crash Detection & Automatic Recovery
If worker `W1` dies or loses connectivity:
1. Heartbeat ceases; `lease_until` stops advancing.
2. The `lease_until` timestamp naturally expires after 15 seconds.
3. The **Scheduler Lease Sweeper** (or any polling worker looking for expired leases) executes:
   ```sql
   SELECT id, attempt, max_attempts
   FROM jobs
   WHERE status IN ('CLAIMED', 'RUNNING')
     AND lease_until < NOW()
   FOR UPDATE SKIP LOCKED;
   ```
4. For each recovered job:
   - If `attempt < max_attempts`: reset to `QUEUED`, clear `assigned_worker_id` and `lease_until`, and log a warning.
   - If `attempt >= max_attempts`: move to `DEAD_LETTER` and create a `DeadLetterJob` entry.

---

## 3. Graceful Shutdown Protocol

When a worker receives a termination signal (`SIGINT` or `SIGTERM`):
1. **State Transition:** Status is set to `DRAINING`.
2. **Stop Polling:** No new jobs are claimed from PostgreSQL.
3. **Wait for In-Flight Jobs:** A grace timer (`WORKER_SHUTDOWN_TIMEOUT_MS`, e.g. 10s) begins. Active tasks are allowed to complete and commit their execution records.
4. **Emergency Release:** If any jobs are still running when the shutdown timeout expires, the worker attempts to cleanly release the leases back to `QUEUED` before exiting.
5. **Clean Exit:** Status is updated to `STOPPED` and the process exits with code 0.
