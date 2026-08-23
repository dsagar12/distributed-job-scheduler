import cronParser from 'cron-parser';

export interface IGetNextCronOccurrenceOptions {
  cronExpression: string;
  currentDate?: Date;
  tz?: string;
}

/**
 * Validates a cron expression string (requires standard 5 or 6 field syntax).
 */
export function isValidCronExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false;
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;

  try {
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates the next occurrence Date for a cron expression.
 */
export function getNextCronOccurrence(options: IGetNextCronOccurrenceOptions): Date {
  const { cronExpression, currentDate = new Date(), tz = 'UTC' } = options;
  const interval = cronParser.parseExpression(cronExpression, {
    currentDate,
    tz,
  });
  return interval.next().toDate();
}
