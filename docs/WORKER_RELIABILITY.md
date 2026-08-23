# Worker Reliability, Concurrency & Lease Fencing

## 1. Concurrency Control & Thread Safety

The Worker Engine implements a bounded concurrency pool controlled by `WORKER_CONCURRENCY`:
1. **Pool Throttling**: Workers maintain `activeJobs: Map<string, RunningJobContext>`. If `activeJobs.size >= concurrency`, claiming is paused until an active execution completes.
2. **SKIP LOCKED Atomicity**: Workers concurrently claim batches from PostgreSQL without blocking each other or causing deadlocks.
3. **Queue-Level Concurrency Enforcement**: The atomic claim SQL CTE evaluates `slots_available` against the queue's `concurrencyLimit`, preventing queue starvation or overload.

---

## 2. Lease Fencing & Stale Worker Prevention

To prevent split-brain execution and zombie worker anomalies (e.g. GC pauses or network partitions):

```
Worker A                    PostgreSQL                  Scheduler Sweeper             Worker B
   │                            │                              │                          │
   ├── Claim Job (Token T1) ───►│                              │                          │
   │◄─── Leased until T+30s ────┤                              │                          │
   │                            │                              │                          │
   │ [GC Pause / Freeze 45s]    │                              │                          │
   │                            │◄── Expired Lease Check ──────┤                          │
   │                            │─── Reset status to QUEUED ──►│                          │
   │                            │                              │                          │
   │                            │◄── Claim Job (Token T2) ────────────────────────────────┤
   │                            │─── Leased until T+75s ─────────────────────────────────►│
   │                            │                              │                          │
   │── Complete (Token T1) ────►│                              │                          │
   │◄── Fenced: Token Mismatch ─┤ (Rows affected = 0)          │                          │
   │                            │                              │                          │
   │                            │◄── Complete (Token T2) ─────────────────────────────────┤
   │                            │─── Status = COMPLETED ─────────────────────────────────►│
```

- Every mutation (`completeJob`, `failJob`, `renewLease`, `startJobExecution`) enforces `WHERE id = $id AND assigned_worker_id = $workerId AND lease_token = $leaseToken AND status = 'RUNNING'`.
- If a worker wakes up after its lease expired, the database update matches 0 rows and returns `null`, safely fencing off stale writes.

---

## 3. Deterministic Retry Backoff with Jitter

Retries calculate backoff delays using deterministic formulas with full random jitter:

| Strategy | Formula | Example with Base Delay 1,000ms |
| :--- | :--- | :--- |
| **FIXED** | $\text{delay} = \text{baseDelay}$ | 1,000ms, 1,000ms, 1,000ms |
| **LINEAR** | $\text{delay} = \text{baseDelay} \times \text{attempt}$ | 1,000ms, 2,000ms, 3,000ms |
| **EXPONENTIAL** | $\text{delay} = \min(\text{maxDelay}, \text{baseDelay} \times \text{multiplier}^{(\text{attempt}-1)})$ | 1,000ms, 2,000ms, 4,000ms, 8,000ms |

- **Full Jitter**: Uniform random distribution between 0 and calculated delay: $\text{delay}_{\text{jitter}} = \text{random}(0, \text{delay})$. Prevents thundering herds on downstream services.
- **Max Delay Ceiling**: Strict bounds prevent unbounded exponential growth.

---

## 4. Dead Letter Queue (DLQ) Lifecycle

When a job reaches `attempt >= maxAttempts`:
1. The status transitions atomically to `DEAD_LETTER`.
2. A record is upserted into `dead_letter_jobs` with `failedReason`, `lastError`, and `lastStackTrace`.
3. Reprocessing from the DLQ resets the job to `QUEUED`, increments `reprocessCount`, and awards additional attempts while preserving historical execution logs.
