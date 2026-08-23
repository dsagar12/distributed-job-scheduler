import { ChaosService } from '../../apps/api/src/chaos/chaos.service';
import { SimulatorService } from '../../apps/api/src/simulator/simulator.service';
import { JobStatus, WorkerStatus } from '@scheduler/types';

describe('Chaos Engineering & Queue Load Simulator Integration Tests', () => {
  let mockJobRepo: any;
  let mockWorkerRepo: any;
  let mockQueueRepo: any;
  let mockMetricsRepo: any;

  let chaosService: ChaosService;
  let simulatorService: SimulatorService;

  beforeEach(() => {
    mockJobRepo = {
      getJobById: jest.fn().mockImplementation(async (id: string) => ({
        id,
        name: 'Mock Test Job',
        status: JobStatus.RUNNING,
        attempt: 1,
        maxAttempts: 3,
        assignedWorkerId: 'worker-1',
        leaseToken: 'token-abc-123',
        leaseUntil: new Date(Date.now() + 30000),
        executions: [{ id: 'exec-1' }],
      })),
      appendLog: jest.fn().mockResolvedValue(true),
      failJob: jest.fn().mockResolvedValue(true),
      recoverExpiredLeases: jest.fn().mockResolvedValue([
        { id: 'job-recovered-1', status: JobStatus.QUEUED, queueId: 'queue-1' },
      ]),
      createJob: jest.fn().mockImplementation(async (params: any) => ({
        job: { id: `sim-job-${Date.now()}-${Math.random()}`, ...params, status: JobStatus.QUEUED },
      })),
    };

    mockWorkerRepo = {
      updateStatus: jest.fn().mockResolvedValue({ id: 'worker-1', status: WorkerStatus.DEAD }),
    };

    mockQueueRepo = {
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueId: 'queue-1',
        queuedCount: 42,
        claimedCount: 5,
        runningCount: 5,
        completedCount: 350,
        failedCount: 4,
        deadLetterCount: 2,
      }),
    };

    mockMetricsRepo = {
      getSystemOverview: jest.fn().mockResolvedValue({
        totalJobsCount: 400,
        activeWorkersCount: 4,
        completedJobsCount: 350,
        avgDurationMs: 380,
      }),
    };

    chaosService = new ChaosService(mockJobRepo, mockWorkerRepo);
    simulatorService = new SimulatorService(mockJobRepo, mockQueueRepo, mockMetricsRepo);
  });

  describe('Chaos Engineering Invariants', () => {
    it('successfully simulates lease expiration and records audit timeline event', async () => {
      const res = await chaosService.simulateLeaseExpiry('job-test-123');
      expect(res.success).toBe(true);

      const timeline = chaosService.getTimeline();
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]?.type).toBe('LEASE_EXPIRED_SIMULATED');
      expect(timeline[0]?.targetId).toBe('job-test-123');
    });

    it('successfully simulates worker kill and updates worker state', async () => {
      const res = await chaosService.simulateWorkerKill('worker-node-99');
      expect(res.success).toBe(true);
      expect(mockWorkerRepo.updateStatus).toHaveBeenCalledWith('worker-node-99', WorkerStatus.DEAD);

      const timeline = chaosService.getTimeline();
      expect(timeline[0]?.type).toBe('WORKER_KILLED_SIMULATED');
    });

    it('injects forced failure and triggers DLQ transition if max attempts reached', async () => {
      mockJobRepo.getJobById = jest.fn().mockResolvedValue({
        id: 'job-failing',
        attempt: 3,
        maxAttempts: 3,
        assignedWorkerId: 'worker-1',
        leaseToken: 'token-xyz',
        executions: [{ id: 'exec-3' }],
      });

      const res = await chaosService.forceJobFailure('job-failing', 'Simulated Network Glitch');
      expect(res.success).toBe(true);
      expect(mockJobRepo.failJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-failing',
          isDeadLetter: true,
          error: 'Simulated Network Glitch',
        }),
      );
    });

    it('triggers recovery sweeper and logs recovered count', async () => {
      const res = await chaosService.triggerRecoverySweep();
      expect(res.success).toBe(true);
      expect(res.recoveredCount).toBe(1);
      expect(mockJobRepo.recoverExpiredLeases).toHaveBeenCalledWith(100);

      const timeline = chaosService.getTimeline();
      expect(timeline[0]?.type).toBe('SWEEPER_TRIGGERED');
    });
  });

  describe('Queue Load Simulator Invariants', () => {
    it('generates synthetic load bursts with requested count and priority parameters', async () => {
      const result = await simulatorService.injectLoadBurst({
        projectId: 'proj-1',
        queueId: 'queue-1',
        count: 20,
        priorityDistribution: 'BALANCED',
        failurePercentage: 20,
      });

      expect(result.enqueuedCount).toBe(20);
      expect(mockJobRepo.createJob).toHaveBeenCalledTimes(20);
      expect(result.sampleJobIds.length).toBeGreaterThan(0);
    });

    it('retrieves authoritative real-time backend telemetry for the target queue', async () => {
      const telemetry = await simulatorService.getSimulationTelemetry('queue-1');
      expect(telemetry.queueMetrics!.queuedCount).toBe(42);
      expect(telemetry.queueMetrics!.runningCount).toBe(5);
      expect(telemetry.systemOverview.activeWorkersCount).toBe(4);
      expect(mockQueueRepo.getQueueMetrics).toHaveBeenCalledWith('queue-1');
    });
  });
});
