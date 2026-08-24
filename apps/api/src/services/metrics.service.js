const { DUMMY_QUEUES, DUMMY_JOBS, DUMMY_WORKERS } = require('../config/dummy-data');

class MetricsService {
  async getOverview(projectId) {
    const queuedCount = 14;
    const runningCount = 7;
    const dlqCount = 5;

    return {
      queueDepth: queuedCount,
      queuedJobsCount: queuedCount,
      runningJobs: runningCount,
      runningJobsCount: runningCount,
      completedJobs: 1840,
      completedJobsCount: 1840,
      activeWorkers: 4,
      totalWorkers: 4,
      throughputPerMinute: 142,
      throughputPerMin: 142,
      failureRate: '0.02',
      avgDurationMs: 142,
      p50DurationMs: 142,
      p95DurationMs: 385,
      p99DurationMs: 840,
      dlqCount,
      deadLetterJobsCount: dlqCount,
    };
  }

  async getTimeline(hours = 24) {
    const points = [];
    const now = Date.now();
    const count = Math.min(hours * 4, 48);
    const intervalMs = (hours * 3600 * 1000) / count;

    for (let i = count; i >= 0; i--) {
      const isPeak = (i % 8 === 0 || i % 7 === 0);
      points.push({
        bucket: new Date(now - i * intervalMs).toISOString(),
        completedCount: isPeak ? Math.floor(Math.random() * 45) + 120 : Math.floor(Math.random() * 30) + 75,
        failedCount: (i === 3 || i === 12) ? 2 : 0,
        retriesCount: (i === 3 || i === 12) ? 3 : 1,
        avgDurationMs: 140 + Math.floor(Math.random() * 80),
        queueDepth: isPeak ? Math.floor(Math.random() * 8) + 12 : Math.floor(Math.random() * 5) + 6,
      });
    }

    return points;
  }

  async getQueuesSummary(projectId) {
    return DUMMY_QUEUES.map((q) => ({
      queueId: q.id,
      queueName: q.name,
      priority: q.priority,
      isPaused: q.isPaused,
      metrics: q.metrics,
    }));
  }
}

module.exports = new MetricsService();
