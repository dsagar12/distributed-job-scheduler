import { Injectable } from '@nestjs/common';
import { JobRepository, QueueRepository, MetricsRepository } from '@scheduler/database';

export interface BurstSimulationParams {
  projectId: string;
  queueId: string;
  count: number;
  priorityDistribution?: 'BALANCED' | 'HIGH_BIAS' | 'RANDOM';
  failurePercentage?: number;
  timeoutMs?: number;
}

@Injectable()
export class SimulatorService {
  constructor(
    private readonly jobRepo: JobRepository,
    private readonly queueRepo: QueueRepository,
    private readonly metricsRepo: MetricsRepository,
  ) {}

  /**
   * Generates a realistic burst of synthetic background jobs in the target queue.
   */
  async injectLoadBurst(params: BurstSimulationParams): Promise<{
    enqueuedCount: number;
    queueId: string;
    sampleJobIds: string[];
    simulatedJobTypes: Record<string, number>;
  }> {
    const { projectId, queueId, count, priorityDistribution = 'BALANCED', failurePercentage = 0, timeoutMs = 30000 } = params;

    const boundedCount = Math.min(Math.max(1, count), 1000); // Between 1 and 1,000 jobs
    const sampleJobIds: string[] = [];
    const jobTypes: Record<string, number> = {
      'Transaction Email': 0,
      'Data Warehouse ETL': 0,
      'Image Thumbnail Resize': 0,
      'Stripe Webhook Sync': 0,
      'Simulated Flaky Task': 0,
    };

    const taskTemplates = [
      { name: 'Transaction Email', payload: { type: 'receipt', customerId: 'cust_8921' }, priority: 80 },
      { name: 'Data Warehouse ETL', payload: { dataset: 'events_raw', records: 10000 }, priority: 40 },
      { name: 'Image Thumbnail Resize', payload: { bucket: 'assets', key: 'banner.png', sizes: [100, 300, 600] }, priority: 50 },
      { name: 'Stripe Webhook Sync', payload: { event: 'payment_intent.succeeded', amount: 4900 }, priority: 90 },
    ];

    for (let i = 0; i < boundedCount; i++) {
      const isFlaky = Math.random() * 100 < failurePercentage;
      let template: { name: string; payload: Record<string, any>; priority: number };

      if (isFlaky) {
        template = {
          name: 'Simulated Flaky Task',
          payload: { handler: 'simulate-failure', shouldFail: true, code: 'UPSTREAM_503' },
          priority: 60,
        };
      } else {
        template = taskTemplates[i % taskTemplates.length]!;
      }

      let priority = template.priority;
      if (priorityDistribution === 'RANDOM') {
        priority = Math.floor(Math.random() * 100) + 1;
      } else if (priorityDistribution === 'HIGH_BIAS') {
        priority = Math.floor(Math.random() * 30) + 70;
      }

      const { job } = await this.jobRepo.createJob({
        projectId,
        queueId,
        name: `${template.name} #${i + 1}`,
        payload: template.payload,
        priority,
        timeoutMs,
        maxAttempts: 3,
      });

      if (sampleJobIds.length < 5) {
        sampleJobIds.push(job.id);
      }
      jobTypes[template.name] = (jobTypes[template.name] || 0) + 1;
    }

    return {
      enqueuedCount: boundedCount,
      queueId,
      sampleJobIds,
      simulatedJobTypes: jobTypes,
    };
  }

  /**
   * Retrieves real-time actual telemetry metrics for the simulated queue.
   */
  async getSimulationTelemetry(queueId: string) {
    const queueMetrics = await this.queueRepo.getQueueMetrics(queueId);
    const systemOverview = await this.metricsRepo.getSystemOverview();

    return {
      queueMetrics,
      systemOverview,
      timestamp: new Date().toISOString(),
    };
  }
}
