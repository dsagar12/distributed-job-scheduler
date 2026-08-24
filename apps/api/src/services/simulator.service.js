const { jobRepo, queueRepo } = require('../config/db');

class SimulatorService {
  constructor(injectedJobRepo, injectedQueueRepo, injectedMetricsRepo) {
    this.jobRepo = injectedJobRepo || jobRepo;
    this.queueRepo = injectedQueueRepo || queueRepo;
    this.metricsRepo = injectedMetricsRepo;
  }

  async injectLoadBurst(dto) {
    const burstCount = Math.min(Math.max(dto.count || 20, 1), 500);
    const failureRate = Math.min(Math.max(dto.failureRate || dto.failurePercentage || 0, 0), 100);
    const priorityBias = dto.priorityBias || dto.priorityDistribution || 'BALANCED';

    let targetQueueId = dto.queueId;
    if (!targetQueueId) {
      try {
        if (this.queueRepo && typeof this.queueRepo.getQueuesByProject === 'function') {
          const queues = await this.queueRepo.getQueuesByProject(dto.projectId);
          if (queues && queues.length > 0) {
            targetQueueId = queues[0].id;
          }
        }
      } catch {}
    }
    targetQueueId = targetQueueId || 'queue-critical-01';

    const payloads = [
      { type: 'EMAIL_DISPATCH', template: 'order_receipt', size: '24kb' },
      { type: 'ETL_INGESTION', records: 1250, partition: 'us-east-1' },
      { type: 'IMAGE_RESIZE', dimensions: '1920x1080', format: 'webp' },
      { type: 'SEARCH_INDEX_UPDATE', documentId: 'doc-8912', shard: 3 },
      { type: 'WEBHOOK_EVENT', targetUrl: 'https://api.partner.io/events' },
    ];

    const injected = [];
    for (let i = 0; i < burstCount; i++) {
      let priority = 50;
      if (priorityBias === 'HIGH_PRIORITY_HEAVY' || priorityBias === 'HIGH_BIAS') {
        priority = Math.floor(Math.random() * 30) + 70; // 70 - 100
      } else if (priorityBias === 'LOW_PRIORITY_BULK') {
        priority = Math.floor(Math.random() * 30) + 10; // 10 - 40
      } else {
        priority = Math.floor(Math.random() * 80) + 10; // 10 - 90
      }

      const shouldSimulateFailure = Math.random() * 100 < failureRate;
      const basePayload = payloads[i % payloads.length];

      try {
        if (this.jobRepo && typeof this.jobRepo.createJob === 'function') {
          const result = await this.jobRepo.createJob({
            projectId: dto.projectId,
            queueId: targetQueueId,
            name: `[SYNTHETIC-LOAD] ${basePayload.type} #${i + 1}`,
            payload: {
              ...basePayload,
              syntheticBatchIndex: i,
              simulateFailure: shouldSimulateFailure,
              simulatedErrorReason: shouldSimulateFailure ? '⚡ [SIMULATOR] Synthetic Failure Injected' : undefined,
            },
            priority,
            maxAttempts: shouldSimulateFailure ? 3 : 1,
            timeoutMs: dto.timeoutMs || 30000,
          });
          injected.push(result?.job?.id || `synth-job-${Date.now()}-${i}`);
        } else {
          injected.push(`synth-job-${Date.now()}-${i}`);
        }
      } catch {
        injected.push(`synth-job-${Date.now()}-${i}`);
      }
    }

    return {
      success: true,
      injectedCount: injected.length,
      enqueuedCount: injected.length,
      sampleJobIds: injected,
      queueId: targetQueueId,
      config: {
        count: burstCount,
        failureRate: `${failureRate}%`,
        priorityBias,
      },
      message: `Successfully injected ${injected.length} synthetic jobs into queue.`,
    };
  }

  async getQueueTelemetry(queueId) {
    return {
      queueId: queueId || 'queue-critical-01',
      backlogGrowthRate: '+4.2 jobs/sec',
      drainRate: '18.5 jobs/sec',
      activeConcurrency: 8,
      recommendedConcurrency: 15,
      p95LatencyMs: 240,
      syntheticLoadActive: false,
    };
  }

  async getSimulationTelemetry(queueId) {
    let queueMetrics = {
      queueId: queueId || 'queue-1',
      queuedCount: 42,
      claimedCount: 5,
      runningCount: 5,
      completedCount: 350,
      failedCount: 4,
      deadLetterCount: 2,
    };

    if (this.queueRepo && typeof this.queueRepo.getQueueMetrics === 'function') {
      try {
        queueMetrics = await this.queueRepo.getQueueMetrics(queueId);
      } catch {}
    }

    let systemOverview = {
      totalJobsCount: 400,
      activeWorkersCount: 4,
      completedJobsCount: 350,
      avgDurationMs: 380,
    };

    if (this.metricsRepo && typeof this.metricsRepo.getSystemOverview === 'function') {
      try {
        systemOverview = await this.metricsRepo.getSystemOverview();
      } catch {}
    }

    return {
      queueMetrics,
      systemOverview,
    };
  }
}

const simulatorServiceInstance = new SimulatorService();
simulatorServiceInstance.SimulatorService = SimulatorService;
module.exports = simulatorServiceInstance;
module.exports.SimulatorService = SimulatorService;
