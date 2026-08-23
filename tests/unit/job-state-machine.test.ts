import { JobStatus } from '@scheduler/types';

describe('Job State Machine & Transition Rules', () => {
  // Allowed transitions matrix based on docs/job-lifecycle.md
  const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
    [JobStatus.SCHEDULED]: [JobStatus.QUEUED, JobStatus.CANCELLED],
    [JobStatus.QUEUED]: [JobStatus.CLAIMED, JobStatus.CANCELLED],
    [JobStatus.CLAIMED]: [JobStatus.RUNNING, JobStatus.QUEUED, JobStatus.CANCELLED],
    [JobStatus.RUNNING]: [
      JobStatus.COMPLETED,
      JobStatus.FAILED,
      JobStatus.TIMED_OUT,
      JobStatus.QUEUED,
      JobStatus.CANCELLED,
    ],
    [JobStatus.FAILED]: [JobStatus.QUEUED, JobStatus.DEAD_LETTER],
    [JobStatus.TIMED_OUT]: [JobStatus.QUEUED, JobStatus.DEAD_LETTER],
    [JobStatus.DEAD_LETTER]: [JobStatus.QUEUED],
    [JobStatus.COMPLETED]: [],
    [JobStatus.CANCELLED]: [],
  };

  function canTransition(from: JobStatus, to: JobStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  describe('Happy path progressions', () => {
    it('should allow SCHEDULED -> QUEUED -> CLAIMED -> RUNNING -> COMPLETED', () => {
      expect(canTransition(JobStatus.SCHEDULED, JobStatus.QUEUED)).toBe(true);
      expect(canTransition(JobStatus.QUEUED, JobStatus.CLAIMED)).toBe(true);
      expect(canTransition(JobStatus.CLAIMED, JobStatus.RUNNING)).toBe(true);
      expect(canTransition(JobStatus.RUNNING, JobStatus.COMPLETED)).toBe(true);
    });
  });

  describe('Failure and retry progressions', () => {
    it('should allow RUNNING -> FAILED -> QUEUED when retries remain', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.FAILED)).toBe(true);
      expect(canTransition(JobStatus.FAILED, JobStatus.QUEUED)).toBe(true);
    });

    it('should allow RUNNING -> FAILED -> DEAD_LETTER when retries are exhausted', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.FAILED)).toBe(true);
      expect(canTransition(JobStatus.FAILED, JobStatus.DEAD_LETTER)).toBe(true);
    });

    it('should allow RUNNING -> TIMED_OUT -> QUEUED / DEAD_LETTER', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.TIMED_OUT)).toBe(true);
      expect(canTransition(JobStatus.TIMED_OUT, JobStatus.QUEUED)).toBe(true);
      expect(canTransition(JobStatus.TIMED_OUT, JobStatus.DEAD_LETTER)).toBe(true);
    });
  });

  describe('Crash recovery & lease timeouts', () => {
    it('should allow CLAIMED -> QUEUED on lease expiry', () => {
      expect(canTransition(JobStatus.CLAIMED, JobStatus.QUEUED)).toBe(true);
    });

    it('should allow RUNNING -> QUEUED on worker crash / lease expiry', () => {
      expect(canTransition(JobStatus.RUNNING, JobStatus.QUEUED)).toBe(true);
    });
  });

  describe('Terminal state immutability', () => {
    it('should disallow any transition from COMPLETED', () => {
      const allStatuses = Object.values(JobStatus);
      for (const target of allStatuses) {
        expect(canTransition(JobStatus.COMPLETED, target)).toBe(false);
      }
    });

    it('should disallow any transition from CANCELLED', () => {
      const allStatuses = Object.values(JobStatus);
      for (const target of allStatuses) {
        expect(canTransition(JobStatus.CANCELLED, target)).toBe(false);
      }
    });

    it('should allow DEAD_LETTER -> QUEUED only upon manual reprocess', () => {
      expect(canTransition(JobStatus.DEAD_LETTER, JobStatus.QUEUED)).toBe(true);
      expect(canTransition(JobStatus.DEAD_LETTER, JobStatus.RUNNING)).toBe(false);
      expect(canTransition(JobStatus.DEAD_LETTER, JobStatus.COMPLETED)).toBe(false);
    });
  });

  describe('Invalid state transitions', () => {
    it('should reject direct jumps from SCHEDULED to RUNNING', () => {
      expect(canTransition(JobStatus.SCHEDULED, JobStatus.RUNNING)).toBe(false);
    });

    it('should reject direct jumps from QUEUED to COMPLETED', () => {
      expect(canTransition(JobStatus.QUEUED, JobStatus.COMPLETED)).toBe(false);
    });

    it('should reject direct jumps from CLAIMED to COMPLETED without RUNNING', () => {
      expect(canTransition(JobStatus.CLAIMED, JobStatus.COMPLETED)).toBe(false);
    });
  });
});
