import { JobStatus } from '@scheduler/types';

describe('Lease Fencing, Crash Recovery & DLQ Simulation Integration Tests', () => {
  interface SimulatedJob {
    id: string;
    queueId: string;
    name: string;
    status: JobStatus;
    attempt: number;
    maxAttempts: number;
    assignedWorkerId: string | null;
    leaseToken: string | null;
    leaseUntil: Date | null;
    error: string | null;
    result: any;
    reprocessCount: number;
  }

  let jobsDb: Map<string, SimulatedJob>;
  let dlqDb: Map<string, any>;

  beforeEach(() => {
    jobsDb = new Map();
    dlqDb = new Map();
  });

  // Simulated atomic claim with lease token generation
  function claimJob(jobId: string, workerId: string, leaseDurationMs: number = 15000): SimulatedJob | null {
    const job = jobsDb.get(jobId);
    if (!job || job.status !== JobStatus.QUEUED) {
      return null;
    }

    job.status = JobStatus.CLAIMED;
    job.assignedWorkerId = workerId;
    job.leaseToken = `lease-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    job.leaseUntil = new Date(Date.now() + leaseDurationMs);
    job.attempt += 1;
    jobsDb.set(jobId, job);
    return job;
  }

  // Simulated complete with fencing token check
  function completeJob(jobId: string, workerId: string, leaseToken: string, result: any): boolean {
    const job = jobsDb.get(jobId);
    if (!job) return false;

    // FENCING TOKEN & WORKER VALIDATION (Matches SQL WHERE id = $1 AND assigned_worker_id = $2 AND lease_token = $3)
    if (job.assignedWorkerId !== workerId || job.leaseToken !== leaseToken || job.status !== JobStatus.RUNNING) {
      return false; // Fencing violation!
    }

    job.status = JobStatus.COMPLETED;
    job.result = result;
    job.leaseUntil = null;
    jobsDb.set(jobId, job);
    return true;
  }

  // Simulated crash recovery sweeper
  function sweepExpiredLeases(): number {
    const now = new Date();
    let recoveredCount = 0;

    for (const [id, job] of jobsDb.entries()) {
      if ((job.status === JobStatus.CLAIMED || job.status === JobStatus.RUNNING) && job.leaseUntil && job.leaseUntil < now) {
        if (job.attempt < job.maxAttempts) {
          job.status = JobStatus.QUEUED;
          job.assignedWorkerId = null;
          job.leaseToken = null;
          job.leaseUntil = null;
          job.error = 'Recovered from expired lease / worker crash';
        } else {
          job.status = JobStatus.DEAD_LETTER;
          job.leaseUntil = null;
          job.error = 'Expired lease on final attempt';
          dlqDb.set(id, {
            jobId: id,
            failedReason: 'Worker crashed on final attempt',
            totalAttempts: job.attempt,
            archivedAt: new Date(),
          });
        }
        jobsDb.set(id, job);
        recoveredCount++;
      }
    }
    return recoveredCount;
  }

  describe('Lease Fencing Protection against Zombie Workers', () => {
    it('should reject state updates from a stale worker after its lease was reclaimed by another worker', () => {
      // 1. Create a job in QUEUED state
      const initialJob: SimulatedJob = {
        id: 'job-fencing-1',
        queueId: 'queue-1',
        name: 'Critical Payment Task',
        status: JobStatus.QUEUED,
        attempt: 0,
        maxAttempts: 3,
        assignedWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
        error: null,
        result: null,
        reprocessCount: 0,
      };
      jobsDb.set(initialJob.id, initialJob);

      // 2. Worker 1 claims job
      const claimedByWorker1 = claimJob(initialJob.id, 'worker-1', 1000);
      expect(claimedByWorker1).not.toBeNull();
      const worker1LeaseToken = claimedByWorker1!.leaseToken!;
      claimedByWorker1!.status = JobStatus.RUNNING;

      // 3. Worker 1 experiences GC pause / network delay, lease expires
      claimedByWorker1!.leaseUntil = new Date(Date.now() - 5000); // in the past

      // 4. Recovery Sweeper runs and resets job to QUEUED
      const recovered = sweepExpiredLeases();
      expect(recovered).toBe(1);
      expect(jobsDb.get(initialJob.id)?.status).toBe(JobStatus.QUEUED);

      // 5. Worker 2 claims the job and gets a NEW lease token
      const claimedByWorker2 = claimJob(initialJob.id, 'worker-2', 15000);
      expect(claimedByWorker2).not.toBeNull();
      const worker2LeaseToken = claimedByWorker2!.leaseToken!;
      expect(worker2LeaseToken).not.toBe(worker1LeaseToken);
      claimedByWorker2!.status = JobStatus.RUNNING;

      // 6. Worker 1 awakens and attempts to complete the job with its OLD lease token
      const worker1Success = completeJob(initialJob.id, 'worker-1', worker1LeaseToken, { paymentStatus: 'STALE' });
      expect(worker1Success).toBe(false); // FENCING CHECK MUST REJECT WORKER 1

      // 7. Worker 2 completes the job with its VALID lease token
      const worker2Success = completeJob(initialJob.id, 'worker-2', worker2LeaseToken, { paymentStatus: 'CHARGED' });
      expect(worker2Success).toBe(true);
      expect(jobsDb.get(initialJob.id)?.status).toBe(JobStatus.COMPLETED);
      expect(jobsDb.get(initialJob.id)?.result).toEqual({ paymentStatus: 'CHARGED' });
    });
  });

  describe('Crash Recovery & Dead Letter Queue Progression', () => {
    it('should reset job to QUEUED on lease expiry if attempts < maxAttempts', () => {
      const job: SimulatedJob = {
        id: 'job-crash-1',
        queueId: 'queue-1',
        name: 'ETL Extract',
        status: JobStatus.QUEUED,
        attempt: 0,
        maxAttempts: 3,
        assignedWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
        error: null,
        result: null,
        reprocessCount: 0,
      };
      jobsDb.set(job.id, job);

      // Claim attempt 1
      const claimed = claimJob(job.id, 'worker-crash-node');
      claimed!.status = JobStatus.RUNNING;
      claimed!.leaseUntil = new Date(Date.now() - 1000); // Expired

      const recoveredCount = sweepExpiredLeases();
      expect(recoveredCount).toBe(1);

      const recoveredJob = jobsDb.get(job.id)!;
      expect(recoveredJob.status).toBe(JobStatus.QUEUED);
      expect(recoveredJob.assignedWorkerId).toBeNull();
      expect(recoveredJob.leaseToken).toBeNull();
      expect(recoveredJob.attempt).toBe(1);
    });

    it('should archive job to DEAD_LETTER when lease expires on final attempt', () => {
      const job: SimulatedJob = {
        id: 'job-final-attempt',
        queueId: 'queue-1',
        name: 'Unstable External API Call',
        status: JobStatus.QUEUED,
        attempt: 2,
        maxAttempts: 3,
        assignedWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
        error: null,
        result: null,
        reprocessCount: 0,
      };
      jobsDb.set(job.id, job);

      // Claim attempt 3 (final attempt)
      const claimed = claimJob(job.id, 'worker-node-x');
      expect(claimed!.attempt).toBe(3);
      claimed!.status = JobStatus.RUNNING;
      claimed!.leaseUntil = new Date(Date.now() - 1000); // Expired

      const recoveredCount = sweepExpiredLeases();
      expect(recoveredCount).toBe(1);

      const dlqJob = jobsDb.get(job.id)!;
      expect(dlqJob.status).toBe(JobStatus.DEAD_LETTER);
      expect(dlqDb.has(job.id)).toBe(true);
      expect(dlqDb.get(job.id).totalAttempts).toBe(3);
    });

    it('should support manual reprocessing from DLQ with fresh retry budget', () => {
      const job: SimulatedJob = {
        id: 'job-reprocess-test',
        queueId: 'queue-1',
        name: 'Failed Webhook',
        status: JobStatus.DEAD_LETTER,
        attempt: 3,
        maxAttempts: 3,
        assignedWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
        error: 'Max retries exhausted',
        result: null,
        reprocessCount: 0,
      };
      jobsDb.set(job.id, job);

      // Manual reprocess action
      const target = jobsDb.get(job.id)!;
      target.status = JobStatus.QUEUED;
      target.reprocessCount += 1;
      target.maxAttempts += 3; // Grant 3 more attempts
      target.error = null;

      expect(target.status).toBe(JobStatus.QUEUED);
      expect(target.reprocessCount).toBe(1);
      expect(target.maxAttempts).toBe(6);

      // Verify it can be claimed again
      const reclaimed = claimJob(target.id, 'worker-new');
      expect(reclaimed).not.toBeNull();
      expect(reclaimed!.attempt).toBe(4);
    });
  });
});
