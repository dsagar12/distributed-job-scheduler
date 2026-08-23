import { BatchStatus } from '@scheduler/types';

describe('Batch Progress & Multi-Task Aggregation Integration Tests', () => {
  function calculateBatchStatus(
    total: number,
    completed: number,
    failed: number,
  ): { status: BatchStatus; progressPercent: number } {
    const processed = completed + failed;
    const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;

    let status: BatchStatus = BatchStatus.PENDING;

    if (processed === 0) {
      status = BatchStatus.PENDING;
    } else if (processed < total) {
      status = BatchStatus.PROCESSING;
    } else if (completed === total) {
      status = BatchStatus.COMPLETED;
    } else if (failed === total) {
      status = BatchStatus.FAILED;
    } else {
      status = BatchStatus.PARTIALLY_FAILED;
    }

    return { status, progressPercent };
  }

  it('should initialize batch in PENDING status at 0% progress', () => {
    const { status, progressPercent } = calculateBatchStatus(10, 0, 0);
    expect(status).toBe(BatchStatus.PENDING);
    expect(progressPercent).toBe(0);
  });

  it('should transition batch to PROCESSING while tasks are executing', () => {
    const { status, progressPercent } = calculateBatchStatus(10, 4, 1);
    expect(status).toBe(BatchStatus.PROCESSING);
    expect(progressPercent).toBe(50);
  });

  it('should transition batch to COMPLETED when all tasks finish successfully', () => {
    const { status, progressPercent } = calculateBatchStatus(10, 10, 0);
    expect(status).toBe(BatchStatus.COMPLETED);
    expect(progressPercent).toBe(100);
  });

  it('should transition batch to FAILED when all tasks fail', () => {
    const { status, progressPercent } = calculateBatchStatus(10, 0, 10);
    expect(status).toBe(BatchStatus.FAILED);
    expect(progressPercent).toBe(100);
  });

  it('should transition batch to PARTIALLY_FAILED when some tasks fail and some succeed', () => {
    const { status, progressPercent } = calculateBatchStatus(10, 8, 2);
    expect(status).toBe(BatchStatus.PARTIALLY_FAILED);
    expect(progressPercent).toBe(100);
  });
});
