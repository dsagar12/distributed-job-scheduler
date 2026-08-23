import * as dotenv from 'dotenv';
dotenv.config();

import { WorkerEngine } from './worker.engine';
import { createLogger } from '@scheduler/shared';

const logger = createLogger('WORKER_BOOTSTRAP');

async function bootstrap() {
  const workerId = process.env.WORKER_ID || `worker-${process.pid}`;
  const concurrency = process.env.WORKER_CONCURRENCY ? parseInt(process.env.WORKER_CONCURRENCY, 10) : 5;
  const pollIntervalMs = process.env.WORKER_POLL_INTERVAL_MS ? parseInt(process.env.WORKER_POLL_INTERVAL_MS, 10) : 500;
  const heartbeatIntervalMs = process.env.WORKER_HEARTBEAT_INTERVAL_MS ? parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS, 10) : 3000;
  const leaseDurationMs = process.env.WORKER_LEASE_DURATION_MS ? parseInt(process.env.WORKER_LEASE_DURATION_MS, 10) : 15000;
  const shutdownTimeoutMs = process.env.WORKER_SHUTDOWN_TIMEOUT_MS ? parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT_MS, 10) : 10000;

  logger.info(`Initializing Distributed Job Scheduler Worker Node [${workerId}]...`);

  const engine = new WorkerEngine({
    workerId,
    concurrency,
    pollIntervalMs,
    heartbeatIntervalMs,
    leaseDurationMs,
    shutdownTimeoutMs,
    redisUrl: process.env.REDIS_URL,
  });

  await engine.start();
  return engine;
}

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Failed to bootstrap Worker', undefined, err);
    process.exit(1);
  });
}

export { bootstrap };
