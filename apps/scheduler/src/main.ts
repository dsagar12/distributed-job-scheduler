import * as dotenv from 'dotenv';
dotenv.config();

import { SchedulerEngine } from './scheduler.engine';
import { createLogger } from '@scheduler/shared';

const logger = createLogger('SCHEDULER_BOOTSTRAP');

async function bootstrap() {
  const pollIntervalMs = process.env.SCHEDULER_POLL_INTERVAL_MS
    ? parseInt(process.env.SCHEDULER_POLL_INTERVAL_MS, 10)
    : 1000;
  const recoveryIntervalMs = process.env.SCHEDULER_RECOVERY_INTERVAL_MS
    ? parseInt(process.env.SCHEDULER_RECOVERY_INTERVAL_MS, 10)
    : 5000;

  logger.info('Initializing Distributed Job Scheduler Daemon...');

  const engine = new SchedulerEngine({
    pollIntervalMs,
    recoveryIntervalMs,
    deadWorkerThresholdMs: 30000,
    retentionDays: 7,
    redisUrl: process.env.REDIS_URL,
  });

  await engine.start();
  return engine;
}

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Failed to bootstrap Scheduler', undefined, err);
    process.exit(1);
  });
}

export { bootstrap };
