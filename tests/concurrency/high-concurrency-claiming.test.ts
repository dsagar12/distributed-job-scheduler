import { JobStatus } from '@scheduler/types';

describe('High-Concurrency Stress & Non-Duplicate Claim Test', () => {
  interface InFlightJob {
    id: string;
    queueId: string;
    priority: number;
    status: JobStatus;
    assignedWorkerId: string | null;
    leaseToken: string | null;
    attempt: number;
  }

  class MockAtomicDatabase {
    private jobs: Map<string, InFlightJob> = new Map();
    private lockMutex: Promise<void> = Promise.resolve();

    // Mutex simulates PostgreSQL row-level transaction isolation (SERIALIZABLE / FOR UPDATE SKIP LOCKED)
    private async withLock<T>(fn: () => T): Promise<T> {
      let releaseLock: () => void;
      const nextLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      const currentLock = this.lockMutex;
      this.lockMutex = nextLock;

      await currentLock;
      try {
        return fn();
      } finally {
        releaseLock!();
      }
    }

    seedJobs(count: number, queueId: string) {
      for (let i = 1; i <= count; i++) {
        const id = `job-stress-${i}`;
        this.jobs.set(id, {
          id,
          queueId,
          priority: Math.floor(Math.random() * 100) + 1,
          status: JobStatus.QUEUED,
          assignedWorkerId: null,
          leaseToken: null,
          attempt: 0,
        });
      }
    }

    /**
     * Atomically claims jobs respecting queue concurrency limits (simulating FOR UPDATE SKIP LOCKED).
     */
    async claimJobs(params: {
      queueId: string;
      workerId: string;
      limit: number;
      concurrencyLimit?: number;
    }): Promise<InFlightJob[]> {
      return this.withLock(() => {
        const { queueId, workerId, limit, concurrencyLimit } = params;

        // 1. Calculate active in-flight count in queue
        let activeCount = 0;
        for (const job of this.jobs.values()) {
          if (job.queueId === queueId && (job.status === JobStatus.CLAIMED || job.status === JobStatus.RUNNING)) {
            activeCount++;
          }
        }

        // 2. Check available slots
        const maxConcurrency = concurrencyLimit && concurrencyLimit > 0 ? concurrencyLimit : Infinity;
        const availableSlots = Math.max(0, maxConcurrency - activeCount);
        if (availableSlots <= 0) {
          return [];
        }

        const claimLimit = Math.min(limit, availableSlots);

        // 3. Find eligible QUEUED jobs sorted by priority DESC
        const eligible: InFlightJob[] = [];
        for (const job of this.jobs.values()) {
          if (job.queueId === queueId && job.status === JobStatus.QUEUED) {
            eligible.push(job);
          }
        }

        eligible.sort((a, b) => b.priority - a.priority);
        const selected = eligible.slice(0, claimLimit);

        // 4. Atomically mark as CLAIMED
        const claimed: InFlightJob[] = [];
        for (const job of selected) {
          job.status = JobStatus.CLAIMED;
          job.assignedWorkerId = workerId;
          job.leaseToken = `lease-${workerId}-${Math.random().toString(36).substring(2, 8)}`;
          job.attempt += 1;
          this.jobs.set(job.id, { ...job });
          claimed.push({ ...job });
        }

        return claimed;
      });
    }

    async completeJob(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
      return this.withLock(() => {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        // Fencing check
        if (job.assignedWorkerId !== workerId || job.leaseToken !== leaseToken || job.status !== JobStatus.RUNNING) {
          return false;
        }

        job.status = JobStatus.COMPLETED;
        job.leaseToken = null;
        this.jobs.set(jobId, job);
        return true;
      });
    }

    async startJob(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
      return this.withLock(() => {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        if (job.assignedWorkerId !== workerId || job.leaseToken !== leaseToken || job.status !== JobStatus.CLAIMED) {
          return false;
        }

        job.status = JobStatus.RUNNING;
        this.jobs.set(jobId, job);
        return true;
      });
    }

    getActiveRunningCount(queueId: string): number {
      let count = 0;
      for (const job of this.jobs.values()) {
        if (job.queueId === queueId && (job.status === JobStatus.CLAIMED || job.status === JobStatus.RUNNING)) {
          count++;
        }
      }
      return count;
    }

    getAllJobs(): InFlightJob[] {
      return Array.from(this.jobs.values());
    }
  }

  it('demonstrates 50 concurrent workers processing 1,000 jobs with zero duplicate claims and bounded queue concurrency', async () => {
    const TOTAL_JOBS = 1000;
    const NUM_WORKERS = 50;
    const QUEUE_CONCURRENCY_LIMIT = 20;
    const QUEUE_ID = 'queue-stress-test';

    const db = new MockAtomicDatabase();
    db.seedJobs(TOTAL_JOBS, QUEUE_ID);

    // Track claim events to assert zero duplicates
    const claimLedger: Map<string, string[]> = new Map(); // jobId -> [workerIds]
    let maxObservedActiveConcurrency = 0;
    let totalCompleted = 0;

    // Simulate 50 concurrent worker loops
    const workerPromises = Array.from({ length: NUM_WORKERS }).map(async (_, workerIdx) => {
      const workerId = `worker-node-${workerIdx + 1}`;

      while (totalCompleted < TOTAL_JOBS) {
        // Sample in-flight concurrency
        const currentInFlight = db.getActiveRunningCount(QUEUE_ID);
        if (currentInFlight > maxObservedActiveConcurrency) {
          maxObservedActiveConcurrency = currentInFlight;
        }

        // Claim runnable jobs
        const claimedJobs = await db.claimJobs({
          queueId: QUEUE_ID,
          workerId,
          limit: 2,
          concurrencyLimit: QUEUE_CONCURRENCY_LIMIT,
        });

        if (claimedJobs.length === 0) {
          // Check if all jobs are finished
          const remaining = db.getAllJobs().filter((j) => j.status !== JobStatus.COMPLETED).length;
          if (remaining === 0) break;
          // Yield execution
          await new Promise((resolve) => setTimeout(resolve, 5));
          continue;
        }

        for (const job of claimedJobs) {
          // Record claim in ledger
          const existingClaims = claimLedger.get(job.id) || [];
          existingClaims.push(workerId);
          claimLedger.set(job.id, existingClaims);

          // Start job
          const started = await db.startJob(job.id, workerId, job.leaseToken!);
          expect(started).toBe(true);

          // Simulate random task execution duration
          await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 8) + 2));

          // Complete job
          const completed = await db.completeJob(job.id, workerId, job.leaseToken!);
          expect(completed).toBe(true);

          totalCompleted++;
        }
      }
    });

    await Promise.all(workerPromises);

    // ==========================================
    // CRITICAL CONCURRENCY INVARIANTS ASSERTION
    // ==========================================

    // 1. All 1,000 jobs must be processed to COMPLETED
    const allJobs = db.getAllJobs();
    expect(allJobs.length).toBe(TOTAL_JOBS);
    const completedCount = allJobs.filter((j) => j.status === JobStatus.COMPLETED).length;
    expect(completedCount).toBe(TOTAL_JOBS);

    // 2. Exactly ZERO duplicate claims (every job claimed exactly once)
    expect(claimLedger.size).toBe(TOTAL_JOBS);
    for (const [, workersList] of claimLedger.entries()) {
      expect(workersList.length).toBe(1); // Never claimed by more than 1 worker!
    }

    // 3. Queue concurrency limit strictly respected (never exceeded 20 active jobs)
    expect(maxObservedActiveConcurrency).toBeLessThanOrEqual(QUEUE_CONCURRENCY_LIMIT);
  });
});
