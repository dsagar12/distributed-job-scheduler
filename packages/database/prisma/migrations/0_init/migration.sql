-- ==============================================================================
-- INITIAL MIGRATION: DISTRIBUTED JOB SCHEDULER (POSTGRESQL 16)
-- ==============================================================================

-- Create Enums
CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'QUEUED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED', 'TIMED_OUT');
CREATE TYPE "RetryStrategy" AS ENUM ('FIXED', 'LINEAR', 'EXPONENTIAL');
CREATE TYPE "WorkerStatus" AS ENUM ('STARTING', 'ACTIVE', 'PAUSED', 'DRAINING', 'STOPPED', 'DEAD');
CREATE TYPE "ScheduledJobStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'DISABLED');
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'TIMED_OUT', 'CANCELLED');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_FAILED', 'CANCELLED');

-- Create Tables
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "api_key" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "retry_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "strategy" "RetryStrategy" NOT NULL DEFAULT 'EXPONENTIAL',
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "initial_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "max_delay_ms" INTEGER NOT NULL DEFAULT 60000,
    "backoff_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "jitter" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retry_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "queues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "concurrency_limit" INTEGER,
    "rate_limit_per_second" INTEGER,
    "default_timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "retry_policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "queue_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_policy_id" UUID,
    "assigned_worker_id" VARCHAR(255),
    "lease_token" VARCHAR(255),
    "claimed_at" TIMESTAMPTZ(6),
    "lease_until" TIMESTAMPTZ(6),
    "idempotency_key" VARCHAR(255),
    "batch_id" UUID,
    "scheduled_job_id" UUID,
    "parent_job_id" UUID,
    "reprocess_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "worker_id" VARCHAR(255) NOT NULL,
    "lease_token" VARCHAR(255) NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "error" TEXT,
    "stack_trace" TEXT,
    "result" JSONB,
    "heartbeat_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "execution_id" UUID,
    "worker_id" VARCHAR(255),
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "context" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workers" (
    "id" VARCHAR(255) NOT NULL,
    "hostname" VARCHAR(255) NOT NULL,
    "pid" INTEGER NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'STARTING',
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "active_jobs_count" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_processed" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_failed" INTEGER NOT NULL DEFAULT 0,
    "ip_address" VARCHAR(100),
    "version" VARCHAR(50),
    "metadata" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMPTZ(6),

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_heartbeats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_id" VARCHAR(255) NOT NULL,
    "active_jobs_count" INTEGER NOT NULL,
    "concurrency" INTEGER NOT NULL,
    "memory_usage_mb" DOUBLE PRECISION NOT NULL,
    "cpu_percent" DOUBLE PRECISION,
    "active_job_ids" JSONB NOT NULL DEFAULT '[]',
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_queues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_id" VARCHAR(255) NOT NULL,
    "queue_id" UUID NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_queues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scheduled_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "queue_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cron_expression" VARCHAR(100),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'ACTIVE',
    "next_run_at" TIMESTAMPTZ(6) NOT NULL,
    "last_run_at" TIMESTAMPTZ(6),
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "max_runs" INTEGER,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dead_letter_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "queue_id" UUID NOT NULL,
    "original_payload" JSONB NOT NULL,
    "failed_reason" TEXT NOT NULL,
    "last_error" TEXT,
    "last_stack_trace" TEXT,
    "total_attempts" INTEGER NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprocessed_at" TIMESTAMPTZ(6),
    "reprocessed_job_id" UUID,

    CONSTRAINT "dead_letter_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "failed_jobs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "batch_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- Unique & Foreign Key Constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "uq_org_user" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

CREATE UNIQUE INDEX "projects_api_key_key" ON "projects"("api_key");
CREATE UNIQUE INDEX "uq_org_project_slug" ON "projects"("organization_id", "slug");
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");

CREATE UNIQUE INDEX "uq_project_retry_policy" ON "retry_policies"("project_id", "name");
CREATE INDEX "retry_policies_project_id_idx" ON "retry_policies"("project_id");

CREATE UNIQUE INDEX "uq_project_queue" ON "queues"("project_id", "name");
CREATE INDEX "queues_project_id_idx" ON "queues"("project_id");

-- CRITICAL: Custom Partial Unique Index for Idempotency Key
CREATE UNIQUE INDEX "uq_jobs_project_idempotency_key" ON "jobs"("project_id", "idempotency_key") WHERE idempotency_key IS NOT NULL;

-- High-performance Query Indexes
CREATE INDEX "idx_jobs_queue_status" ON "jobs"("queue_id", "status");
CREATE INDEX "idx_jobs_status_run_at" ON "jobs"("status", "run_at");
CREATE INDEX "idx_jobs_lease_until" ON "jobs"("lease_until");
CREATE INDEX "idx_jobs_project_id" ON "jobs"("project_id");
CREATE INDEX "idx_jobs_batch_id" ON "jobs"("batch_id");
CREATE INDEX "idx_jobs_scheduled_job_id" ON "jobs"("scheduled_job_id");

-- CRITICAL: Partial Indexes for High-Frequency SKIP LOCKED Engine
CREATE INDEX "idx_jobs_claim_runnable" ON "jobs"("queue_id", "priority" DESC, "run_at" ASC) WHERE status = 'QUEUED';
CREATE INDEX "idx_jobs_expired_leases" ON "jobs"("lease_until") WHERE status IN ('CLAIMED', 'RUNNING');

CREATE INDEX "idx_job_executions_job_attempt" ON "job_executions"("job_id", "attempt");
CREATE INDEX "idx_job_executions_worker_id" ON "job_executions"("worker_id");
CREATE INDEX "idx_job_executions_started_at" ON "job_executions"("started_at");

CREATE INDEX "idx_job_logs_job_timestamp" ON "job_logs"("job_id", "timestamp");
CREATE INDEX "idx_job_logs_execution_id" ON "job_logs"("execution_id");

CREATE INDEX "idx_worker_heartbeats_timestamp" ON "worker_heartbeats"("worker_id", "timestamp" DESC);

CREATE UNIQUE INDEX "uq_worker_queue" ON "worker_queues"("worker_id", "queue_id");
CREATE INDEX "worker_queues_worker_id_idx" ON "worker_queues"("worker_id");
CREATE INDEX "worker_queues_queue_id_idx" ON "worker_queues"("queue_id");

CREATE INDEX "idx_scheduled_jobs_due" ON "scheduled_jobs"("status", "next_run_at");
CREATE INDEX "scheduled_jobs_project_id_idx" ON "scheduled_jobs"("project_id");
CREATE INDEX "scheduled_jobs_queue_id_idx" ON "scheduled_jobs"("queue_id");
CREATE INDEX "idx_scheduled_jobs_due_active" ON "scheduled_jobs"("status", "next_run_at") WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX "dead_letter_jobs_job_id_key" ON "dead_letter_jobs"("job_id");
CREATE INDEX "idx_dlq_queue_archived" ON "dead_letter_jobs"("queue_id", "archived_at");

CREATE INDEX "batches_project_id_idx" ON "batches"("project_id");
CREATE UNIQUE INDEX "batch_jobs_job_id_key" ON "batch_jobs"("job_id");
CREATE UNIQUE INDEX "uq_batch_order" ON "batch_jobs"("batch_id", "order_index");
CREATE INDEX "batch_jobs_batch_id_idx" ON "batch_jobs"("batch_id");

-- Foreign Keys
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "retry_policies" ADD CONSTRAINT "retry_policies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "queues" ADD CONSTRAINT "queues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "queues" ADD CONSTRAINT "queues_retry_policy_id_fkey" FOREIGN KEY ("retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_retry_policy_id_fkey" FOREIGN KEY ("retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_scheduled_job_id_fkey" FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduled_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "job_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_heartbeats" ADD CONSTRAINT "worker_heartbeats_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_queues" ADD CONSTRAINT "worker_queues_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_queues" ADD CONSTRAINT "worker_queues_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dead_letter_jobs" ADD CONSTRAINT "dead_letter_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dead_letter_jobs" ADD CONSTRAINT "dead_letter_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
