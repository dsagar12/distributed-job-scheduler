import { RetryStrategy } from '@scheduler/types';
import { DEFAULT_CONFIG } from '../constants';

export interface ICalculateNextDelayOptions {
  strategy: RetryStrategy;
  attempt: number; // 1-indexed attempt that just failed
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

/**
 * Calculates the next retry delay in milliseconds based on the configured strategy.
 * Implements exponential backoff with full jitter to avoid thundering herd problem.
 */
export function calculateNextRetryDelay(options: ICalculateNextDelayOptions): number {
  const {
    strategy,
    attempt,
    initialDelayMs = DEFAULT_CONFIG.RETRY.DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_CONFIG.RETRY.DEFAULT_MAX_DELAY_MS,
    backoffMultiplier = DEFAULT_CONFIG.RETRY.DEFAULT_MULTIPLIER,
    jitter = DEFAULT_CONFIG.RETRY.DEFAULT_JITTER,
  } = options;

  if (attempt < 1) {
    return initialDelayMs;
  }

  let delay = initialDelayMs;

  switch (strategy) {
    case RetryStrategy.FIXED:
      delay = initialDelayMs;
      break;

    case RetryStrategy.LINEAR:
      // delay = initialDelayMs * attempt
      delay = initialDelayMs * attempt;
      break;

    case RetryStrategy.EXPONENTIAL:
      // delay = initialDelayMs * (multiplier ^ (attempt - 1))
      delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      break;

    default:
      delay = initialDelayMs;
  }

  // Cap at max delay
  const cappedDelay = Math.min(delay, maxDelayMs);

  // Apply Full Jitter: random value between 0.5 * delay and delay (or 0 to cappedDelay)
  if (jitter) {
    const minJitter = cappedDelay * 0.5;
    const maxJitter = cappedDelay;
    return Math.floor(minJitter + Math.random() * (maxJitter - minJitter));
  }

  return Math.floor(cappedDelay);
}

/**
 * Computes the exact future Date for the next retry attempt.
 */
export function calculateNextRetryDate(options: ICalculateNextDelayOptions, fromDate: Date = new Date()): Date {
  const delayMs = calculateNextRetryDelay(options);
  return new Date(fromDate.getTime() + delayMs);
}
