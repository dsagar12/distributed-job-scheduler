# End-to-End Data Flow

This document details the exact sequence of events and message interactions across the Distributed Job Scheduler.

---

## 1. Job Ingestion Flow (Immediate, Delayed, and Batch)

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client / User
    participant API as NestJS API Gateway
    participant DB as PostgreSQL Database
    participant Redis as Redis Pub/Sub

    Client->>API: POST /api/v1/jobs (Queue, Payload, Priority, Delay/RunAt)
    Note over API: Validates payload, checks idempotency key & queue status
    API->>DB: INSERT INTO jobs (status: 'QUEUED' or 'SCHEDULED', run_at, ...)
    DB-->>API: Returns Job Record (UUID)
    API->>Redis: PUBLISH job:created { jobId, queueId, status }
    API-->>Client: 201 Created (Job DTO)
```

---

## 2. Atomic Job Claiming & Execution Flow

```mermaid
sequenceDiagram
    autonumber
    participant Worker as Worker Process (W1)
    participant DB as PostgreSQL Database
    participant Redis as Redis (Pub/Sub & Cache)
    participant WS as WebSocket Clients

    loop Polling Loop (Bounded by Concurrency Capacity)
        Worker->>DB: BEGIN TRANSACTION
        Worker->>DB: SELECT * FROM jobs WHERE queue_id = $1 AND status = 'QUEUED' AND run_at <= NOW() ORDER BY priority DESC, run_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
        alt Job Found
            Worker->>DB: UPDATE jobs SET status = 'CLAIMED', assigned_worker_id = $workerId, claimed_at = NOW(), lease_until = NOW() + INTERVAL '15s', attempt = attempt + 1 WHERE id = $jobId
            Worker->>DB: INSERT INTO job_executions (job_id, worker_id, attempt, status, started_at) VALUES (...)
            Worker->>DB: COMMIT TRANSACTION
            Worker->>Redis: PUBLISH job:claimed { jobId, workerId }
            Worker->>DB: UPDATE jobs SET status = 'RUNNING' WHERE id = $jobId
            
            par Job Execution Sandbox
                Worker->>Worker: Run job handler logic (with timeout timer)
            and Lease Extension Heartbeat
                loop Every 3 Seconds While Running
                    Worker->>DB: UPDATE jobs SET lease_until = NOW() + INTERVAL '15s' WHERE id = $jobId
                    Worker->>Redis: SETEX worker:heartbeat:$workerId 10s
                end
            end

            alt Execution Success
                Worker->>DB: UPDATE jobs SET status = 'COMPLETED', result = $result, completed_at = NOW() WHERE id = $jobId
                Worker->>DB: UPDATE job_executions SET status = 'SUCCESS', finished_at = NOW(), duration_ms = $duration, result = $result WHERE id = $execId
                Worker->>Redis: PUBLISH job:completed { jobId }
            else Execution Failure
                Worker->>DB: Record Failure & Trigger Retry Logic
            end
        else No Job Found
            Worker->>DB: COMMIT / ROLLBACK
            Worker->>Worker: Backoff sleep (e.g., 1500ms)
        end
    end
```

---

## 3. Scheduled & Recurring Cron Job Progression Flow

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Dedicated Scheduler Daemon
    participant DB as PostgreSQL Database
    participant Redis as Redis Pub/Sub

    loop Every 1 Second
        Sched->>DB: SELECT * FROM scheduled_jobs WHERE status = 'ACTIVE' AND next_run_at <= NOW() FOR UPDATE SKIP LOCKED
        loop For Each Due Schedule
            Sched->>DB: INSERT INTO jobs (queue_id, project_id, name, payload, status, scheduled_job_id, run_at) VALUES (..., 'QUEUED', $schedId, NOW())
            Sched->>Sched: Calculate next_run_at using CronExpression & Timezone
            Sched->>DB: UPDATE scheduled_jobs SET last_run_at = NOW(), next_run_at = $nextRun, total_runs = total_runs + 1 WHERE id = $schedId
            Sched->>Redis: PUBLISH job:created { jobId, scheduleId }
        end
    end
```

---

## 4. Crash Recovery & Expired Lease Reconciliation Flow

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Scheduler Daemon / Sweeper
    participant DB as PostgreSQL Database
    participant W2 as Available Worker Node

    Note over Sched: Scans for abandoned jobs where workers crashed
    Sched->>DB: SELECT * FROM jobs WHERE status IN ('CLAIMED', 'RUNNING') AND lease_until < NOW() FOR UPDATE SKIP LOCKED
    loop For Each Expired Job
        alt attempt < max_attempts
            Sched->>DB: INSERT INTO job_logs (job_id, level, message) VALUES ($id, 'WARN', 'Worker lease expired; rescheduling job for retry.')
            Sched->>DB: UPDATE jobs SET status = 'QUEUED', assigned_worker_id = NULL, lease_until = NULL, run_at = NOW() WHERE id = $id
        else attempt >= max_attempts
            Sched->>DB: UPDATE jobs SET status = 'DEAD_LETTER' WHERE id = $id
            Sched->>DB: INSERT INTO dead_letter_jobs (job_id, failed_reason) VALUES ($id, 'Lease expired and max attempts exceeded')
        end
    end
    W2->>DB: Polls and atomically claims the recovered QUEUED job
```
