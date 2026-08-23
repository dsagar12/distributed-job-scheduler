import { isValidCronExpression, getNextCronOccurrence } from '@scheduler/shared';

describe('CronHelper Unit Tests', () => {
  describe('isValidCronExpression', () => {
    it('should return true for valid 5-part cron expressions', () => {
      expect(isValidCronExpression('0 * * * *')).toBe(true); // Hourly
      expect(isValidCronExpression('*/5 * * * *')).toBe(true); // Every 5 min
      expect(isValidCronExpression('0 0 * * *')).toBe(true); // Daily midnight
      expect(isValidCronExpression('0 12 * * 1-5')).toBe(true); // Weekdays at noon
      expect(isValidCronExpression('15 14 1 * *')).toBe(true); // 1st of month
    });

    it('should return false for invalid cron strings', () => {
      expect(isValidCronExpression('invalid-cron')).toBe(false);
      expect(isValidCronExpression('* * *')).toBe(false);
      expect(isValidCronExpression('60 * * * *')).toBe(false); // Minute > 59
      expect(isValidCronExpression('')).toBe(false);
    });
  });

  describe('getNextCronOccurrence', () => {
    it('should correctly calculate the next hourly run', () => {
      const fixedBase = new Date('2026-08-23T14:15:00.000Z');
      const nextRun = getNextCronOccurrence({
        cronExpression: '0 * * * *',
        currentDate: fixedBase,
        tz: 'UTC',
      });

      expect(nextRun.toISOString()).toBe('2026-08-23T15:00:00.000Z');
    });

    it('should correctly calculate next 5-minute interval', () => {
      const fixedBase = new Date('2026-08-23T14:11:30.000Z');
      const nextRun = getNextCronOccurrence({
        cronExpression: '*/5 * * * *',
        currentDate: fixedBase,
        tz: 'UTC',
      });

      expect(nextRun.toISOString()).toBe('2026-08-23T14:15:00.000Z');
    });

    it('should correctly calculate midnight next run across dates', () => {
      const fixedBase = new Date('2026-08-23T23:55:00.000Z');
      const nextRun = getNextCronOccurrence({
        cronExpression: '0 0 * * *',
        currentDate: fixedBase,
        tz: 'UTC',
      });

      expect(nextRun.toISOString()).toBe('2026-08-24T00:00:00.000Z');
    });
  });
});
