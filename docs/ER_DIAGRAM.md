# Distributed Job Scheduler - Database Schema & ER Diagram

## Authoritative Relational Architecture

The Distributed Job Scheduler employs **PostgreSQL 16** as the strictly authoritative single source of truth for all job states, queues, workers, batches, and execution audit trails. **Redis 7** functions exclusively as an ephemeral coordination cache and Pub/Sub event bus.

---

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER_MEMBERSHIP : has
    ORGANIZATION ||--o{ PROJECT : contains
    USER ||--o{ USER_MEMBERSHIP : holds
    USER ||--o{ REFRESH_TOKEN : owns

    PROJECT ||--o{ QUEUE : defines
    PROJECT ||--o{ JOB : receives
    PROJECT ||--o{ BATCH : groups
    PROJECT ||--o{ SCHEDULED_JOB : schedules
    PROJECT ||--o{ DEAD_LETTER_JOB : archives
    PROJECT ||--o{ SYSTEM_METRIC : tracks

    QUEUE ||--o{ JOB : buffers
    QUEUE ||--o{ SCHEDULED_JOB : executes
    QUEUE ||--o{ DEAD_LETTER_JOB : isolates
    QUEUE ||--o{ WORKER_QUEUE : assigned_to

    WORKER ||--o{ WORKER_QUEUE : subscribes
    WORKER ||--o{ WORKER_HEARTBEAT : emits
    WORKER ||--o{ JOB_EXECUTION : runs

    BATCH ||--o{ JOB : contains

    JOB ||--o{ JOB_EXECUTION : logs_attempts
    JOB ||--o{ JOB_LOG : emits_logs
    JOB ||--o| DEAD_LETTER_JOB : moves_on_exhaustion

    ORGANIZATION {
        uuid id PK
        string name
        string slug UK
        datetime created_at
        datetime updated_at
    }

    USER {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        datetime created_at
        datetime updated_at
    }

    PROJECT {
        uuid id PK
        uuid organization_id FK
        string name
        string slug
        string api_key UK
        datetime created_at
        datetime updated_at
    }

    QUEUE {
        uuid id PK
        uuid project_id FK
        string name
        string description
        int priority
        int concurrency_limit
        int rate_limit_per_second
        int default_timeout_ms
        int default_max_attempts
        boolean is_paused
        datetime created_at
        datetime updated_at
    }

    JOB {
        uuid id PK
        uuid project_id FK
        uuid queue_id FK
        uuid batch_id FK
        uuid scheduled_job_id FK
        string name
        jsonb payload
        jsonb result
        enum status
        int priority
        int attempt
        int max_attempts
        int timeout_ms
        int reprocess_count
        string idempotency_key
        string assigned_worker_id
        string lease_token
        datetime lease_until
        datetime run_at
        datetime claimed_at
        datetime started_at
        datetime completed_at
        text error
        datetime created_at
        datetime updated_at
    }

    JOB_EXECUTION {
        uuid id PK
        uuid job_id FK
        string worker_id
        string lease_token
        int attempt
        enum status
        datetime started_at
        datetime finished_at
        int duration_ms
        text error
        text stack_trace
        jsonb result
        datetime created_at
    }

    DEAD_LETTER_JOB {
        uuid id PK
        uuid job_id FK,UK
        uuid project_id FK
        uuid queue_id FK
        text failed_reason
        text last_error
        text last_stack_trace
        int total_attempts
        datetime archived_at
        datetime resolved_at
    }

    SCHEDULED_JOB {
        uuid id PK
        uuid project_id FK
        uuid queue_id FK
        string name
        string cron_expression
        string timezone
        jsonb payload
        datetime next_run_at
        datetime last_run_at
        int total_runs
        int max_runs
        enum status
        datetime created_at
        datetime updated_at
    }

    BATCH {
        uuid id PK
        uuid project_id FK
        string name
        enum status
        int total_jobs
        int completed_jobs
        int failed_jobs
        jsonb metadata
        datetime created_at
        datetime updated_at
    }

    WORKER {
        string id PK
        string hostname
        string ip_address
        int pid
        int concurrency
        int active_jobs_count
        enum status
        datetime started_at
        datetime last_heartbeat_at
        datetime stopped_at
        int total_jobs_processed
        int total_jobs_failed
    }
```

---

## Critical PostgreSQL Indexes & Constraints

### 1. Partial Unique Index for Idempotency
```sql
CREATE UNIQUE INDEX uq_jobs_project_idempotency_key 
ON jobs(project_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```
*Guarantee*: Submissions with identical `(project_id, idempotency_key)` are atomically deduplicated, while standard jobs with `NULL` keys are unconstrained.

### 2. High-Performance Atomic Claim Index
```sql
CREATE INDEX idx_jobs_claim_runnable 
ON jobs(queue_id, status, run_at, priority DESC, created_at ASC);
```
*Guarantee*: Allows PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` queries to evaluate runnable candidates with sub-millisecond index scans under high worker concurrency.

### 3. Expired Lease Crash Recovery Index
```sql
CREATE INDEX idx_jobs_expired_leases 
ON jobs(status, lease_until) 
WHERE status IN ('CLAIMED', 'RUNNING');
```
*Guarantee*: The Scheduler daemon scans expired leases in `O(log N)` time without full table scans.
