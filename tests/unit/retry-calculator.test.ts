import { RetryStrategy } from '@scheduler/types';
import { calculateNextRetryDelay } from '@scheduler/shared';

describe('RetryCalculator Unit Tests', () => {
  describe('FIXED strategy', () => {
    it('should return fixed initial delay regardless of attempt count', () => {
      const initialDelayMs = 2000;
      const delay1 = calculateNextRetryDelay({
        strategy: RetryStrategy.FIXED,
        attempt: 1,
        initialDelayMs,
        jitter: false,
      });
      const delay3 = calculateNextRetryDelay({
        strategy: RetryStrategy.FIXED,
        attempt: 3,
        initialDelayMs,
        jitter: false,
      });

      expect(delay1).toBe(2000);
      expect(delay3).toBe(2000);
    });
  });

  describe('LINEAR strategy', () => {
    it('should scale delay proportionally with attempt count', () => {
      const initialDelayMs = 1000;
      const delay1 = calculateNextRetryDelay({
        strategy: RetryStrategy.LINEAR,
        attempt: 1,
        initialDelayMs,
        jitter: false,
      });
      const delay2 = calculateNextRetryDelay({
        strategy: RetryStrategy.LINEAR,
        attempt: 2,
        initialDelayMs,
        jitter: false,
      });
      const delay3 = calculateNextRetryDelay({
        strategy: RetryStrategy.LINEAR,
        attempt: 3,
        initialDelayMs,
        jitter: false,
      });

      expect(delay1).toBe(1000);
      expect(delay2).toBe(2000);
      expect(delay3).toBe(3000);
    });
  });

  describe('EXPONENTIAL strategy', () => {
    it('should scale exponentially base * 2^(attempt-1)', () => {
      const initialDelayMs = 1000;
      const delay1 = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 1,
        initialDelayMs,
        backoffMultiplier: 2,
        jitter: false,
      });
      const delay2 = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 2,
        initialDelayMs,
        backoffMultiplier: 2,
        jitter: false,
      });
      const delay3 = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 3,
        initialDelayMs,
        backoffMultiplier: 2,
        jitter: false,
      });
      const delay4 = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 4,
        initialDelayMs,
        backoffMultiplier: 2,
        jitter: false,
      });

      expect(delay1).toBe(1000); // 1000 * 2^0
      expect(delay2).toBe(2000); // 1000 * 2^1
      expect(delay3).toBe(4000); // 1000 * 2^2
      expect(delay4).toBe(8000); // 1000 * 2^3
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 10,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        jitter: false,
      });

      expect(delay).toBe(10000);
    });

    it('should apply jitter within [0.5 * delay, delay] range', () => {
      const initialDelayMs = 4000;
      const delay = calculateNextRetryDelay({
        strategy: RetryStrategy.EXPONENTIAL,
        attempt: 1,
        initialDelayMs,
        jitter: true,
      });

      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(4000);
    });
  });
});
