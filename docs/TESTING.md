# Distributed Job Scheduler - Testing & Verification Guide

## Testing Architecture

The test suite validates architectural guarantees, database integrity, distributed lease fencing, cron parsing, retry calculations, crash recovery, and high-concurrency contention.

---

## Test Suites Summary

| Test Suite | Location | Tests | Focus Area |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | `tests/unit/` | 22 | Retry Backoff (Fixed/Linear/Exponential/Jitter), Job State Machine, Cron Parser & Next Run calculations |
| **Integration Tests**| `tests/integration/` | 9 | Lease fencing token verification, zombie worker rejection, crash recovery sweeper, DLQ archival, manual reprocess, batch aggregation |
| **Concurrency Stress**| `tests/concurrency/` | 1 | **50 Concurrent Workers** claiming **1,000 Jobs** with **Zero Duplicate Claims** and strict queue concurrency enforcement |

---

## Running Test Suites

### 1. Run All Tests
```bash
npm run test:unit
npm run test:integration
npm run test:concurrency
```

### 2. Run Unit Tests Only
```bash
npm run test:unit
```
*Output*:
```
PASS tests/unit/retry-calculator.test.ts
PASS tests/unit/job-state-machine.test.ts
PASS tests/unit/cron-helper.test.ts
Test Suites: 3 passed, 3 total
Tests:       22 passed, 22 total
```

### 3. Run Integration Tests
```bash
npm run test:integration
```
*Output*:
```
PASS tests/integration/lease-fencing-and-recovery.test.ts
PASS tests/integration/batch-and-api-flow.test.ts
Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
```

### 4. Run High-Concurrency Stress Test
```bash
npm run test:concurrency
```
*Output*:
```
PASS tests/concurrency/high-concurrency-claiming.test.ts
  High-Concurrency Stress & Non-Duplicate Claim Test
    ✓ demonstrates 50 concurrent workers processing 1,000 jobs with zero duplicate claims and bounded queue concurrency (853 ms)
```

---

## Critical Invariants Tested

1. **Zero Duplicate Claims**:
   Verified across 50 concurrent workers by recording all claim events in a thread-safe claim ledger. Every job is claimed exactly once per attempt.
2. **Queue Concurrency Bounds**:
   Verified that queue in-flight concurrency strictly respects configured limits at all times.
3. **Lease Fencing Protection**:
   Verified that a stale worker with an expired lease token is rejected when attempting to complete a job that was reclaimed by another worker.
4. **Deterministic Exponential Backoff**:
   Verified retry delays adhere to configured base, exponent multipliers, jitter boundaries, and ceiling maximums.
