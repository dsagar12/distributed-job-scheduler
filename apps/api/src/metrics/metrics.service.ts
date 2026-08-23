import { Injectable } from '@nestjs/common';
import { MetricsRepository, QueueRepository } from '@scheduler/database';

@Injectable()
export class MetricsService {
  constructor(
    private readonly metricsRepo: MetricsRepository,
    private readonly queueRepo: QueueRepository,
  ) {}

  async getOverview(projectId?: string) {
    return this.metricsRepo.getSystemOverview(projectId);
  }

  async getTimeline(hours: number = 24) {
    return this.metricsRepo.getThroughputTimeline(hours);
  }

  async getQueuesSummary(projectId: string) {
    const queues = await this.queueRepo.getQueuesByProject(projectId);
    const summaries = [];

    for (const q of queues) {
      const metrics = await this.queueRepo.getQueueMetrics(q.id);
      summaries.push(metrics);
    }

    return summaries;
  }
}
