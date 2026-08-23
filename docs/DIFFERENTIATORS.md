# Differentiating Architectural Layers

This document details the production engineering differentiation layer added to the **Distributed Job Scheduler**, why each capability was designed, and how it embodies production-grade distributed systems thinking.

---

## 1. Chaos Engineering Console (`/chaos`)

### Problem Statement
In distributed systems, failures are guaranteed to happen:
- Worker processes crash or experience Stop-The-World garbage collection pauses.
- Network partitions prevent lease renewal heartbeats.
- Stale workers attempt to commit mutations after losing ownership.

Testing these edge cases manually by killing containers or tweaking database tables is slow and error-prone.

### Architectural Solution
The **Chaos Engineering Lab** allows engineers and evaluators to inject controlled, deterministic faults directly through the REST API and Dashboard:
1. **Simulate Lease Expiry**: Backdates a job's `leaseUntil` timestamp into the past while the job is still marked `RUNNING`. This tests that the scheduler's crash recovery loop detects the expired lease and that the stale worker's eventual write is fenced out.
2. **Simulate Worker Node Failure**: Immediately marks an active worker node as `DEAD` and ceases heartbeat evaluations, verifying that all in-flight jobs leased by that node are safely orphaned and reclaimed by peer workers.
3. **Force In-Flight Task Failure**: Injects an unhandled exception into an in-flight job to verify retry progression (`maxAttempts`), backoff calculation, and dead-letter archival.
4. **Trigger On-Demand Recovery Sweeper**: Manually triggers the PostgreSQL crash recovery sweep to measure reclamation latency.
5. **Chaos & Recovery Audit Timeline**: Every fault injection and recovery step is immutably logged and streamed to the dashboard.

```
+---------------------+     (Fault Injected)     +---------------------+
| In-Flight Job       | -----------------------> | Backdated Lease     |
| status: RUNNING     |                          | leaseUntil < NOW()  |
+---------------------+                          +---------------------+
                                                            |
                                                            v
+---------------------+    (Fencing Prevents Stale)   +---------------------+
| Stale Worker Write  | <--------------------------- | Sweeper Reclaims    |
| (REJECTED: 0 rows)  |                              | status -> QUEUED    |
+---------------------+                              +---------------------+
```

---

## 2. AI Failure Investigator (`/investigator`)

### Problem Statement
When background jobs fail at scale, on-call engineers are inundated with raw stack traces, ambiguous gateway timeouts, and database serialization errors. Determining whether an incident is caused by transient network blips, external rate-limiting, or memory exhaustion requires tedious log analysis.

### Architectural Solution & Strict Safety Guardrails
The **AI Failure Investigator** provides automated root-cause analysis and configuration recommendations for failed and dead-letter jobs.

#### Safety Guardrail Invariant
> **Strict Non-Mutating Guardrail**: The AI Investigator is **strictly read-only and diagnostic**. It can NEVER override job states, mutate database records, or trigger unvetted execution state transitions.

#### Failure Taxonomy & Heuristic Diagnostic Engine
The engine analyzes error messages, execution stack traces, and historical attempt patterns, categorizing incidents into:
- `TIMEOUT_DEADLINE`: Execution exceeded `timeoutMs`. Recommends timeout expansion and batch query chunking.
- `RATE_LIMIT_429`: Downstream API returned HTTP 429. Recommends switching retry strategy to `EXPONENTIAL` with randomized full jitter and queue-level rate limiting.
- `UPSTREAM_5XX`: External server outage or bad gateway. Recommends linear backoff with increased `maxAttempts`.
- `DATABASE_LOCK_TIMEOUT`: PostgreSQL deadlock (`P2034`) or row lock contention. Recommends transaction isolation auditing and `SELECT FOR UPDATE SKIP LOCKED`.
- `RESOURCE_EXHAUSTION`: V8 heap out-of-memory. Recommends streaming payload processing over in-memory buffering.
- `SERIALIZATION_ERROR`: Malformed JSON or schema drift. Recommends boundary DTO validation to reject corrupt inputs at ingestion time.

#### Graceful Offline Fallback
The investigator uses an embedded deterministic heuristic diagnostic engine that produces instant analysis without external internet or third-party LLM API dependencies.

---

## 3. Queue Load Simulator

### Problem Statement
Evaluating a distributed job scheduler under synthetic load often relies on mocked UI counters or disconnected benchmark scripts. Evaluators cannot observe how the system handles bursts of competing priorities and queue depth variations in real time.

### Architectural Solution
The **Queue Load Simulator** ingests real batches of jobs (from 10 to 1,000 tasks) directly into the PostgreSQL database:
- **Configurable Batch Size**: Smoothly adjustable via a reactive slider.
- **Priority Curve Modeling**: Choose between `Balanced (40-90)`, `High-Priority Bias (70-100)`, or `Uniform Random (1-100)`.
- **Configurable Flakiness**: Injects simulated error rates (0% to 50%) to observe retry behavior and DLQ ingestion.
- **Authoritative Telemetry**: Displays real-time queue depth, active claimed/running slots, completed job throughput, and execution latencies directly from the database and worker telemetry.

---

## 4. Visual Job Execution Timeline

### Problem Statement
A distributed job transitions through a complex state machine (`CREATED` &rarr; `QUEUED` &rarr; `CLAIMED` &rarr; `RUNNING` &rarr; `FAILED` / `RETRYING` &rarr; `COMPLETED` / `DEAD_LETTER`). Inspecting raw timestamps across multiple database tables makes understanding execution progression difficult.

### Architectural Solution
The **Job Execution Timeline** is embedded into the job details inspector, providing a visual step-by-step breadcrumb trail:
1. **Created**: Ingestion timestamp and idempotency key.
2. **Queued / Scheduled**: Queue priority and run eligibility.
3. **Claimed (Leased)**: Assigned worker node ID and active cryptographic lease token.
4. **Running**: Current attempt index vs. max attempt budget.
5. **Terminal State**: Visual badge for `COMPLETED`, `DEAD_LETTER`, or `CANCELLED`.

---

## 5. Verification & Test Evidence

All 4 differentiating features are covered by dedicated test suites:
- `tests/unit/investigator-analyzer.test.ts`: Validates failure classification, recommendations, and the AI non-mutation invariant (**5 / 5 Passed**).
- `tests/integration/chaos-and-simulator.test.ts`: Validates lease backdating, worker kill simulations, forced failures, and load burst generation (**6 / 6 Passed**).
- Monorepo Total: **50 / 50 Tests Passing (100%)**.
