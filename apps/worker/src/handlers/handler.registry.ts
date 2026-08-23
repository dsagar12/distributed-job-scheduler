import { Job } from '@prisma/client';

export interface JobExecutionContext {
  job: Job;
  executionId: string;
  workerId: string;
  attempt: number;
  log: (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) => Promise<void>;
  signal: AbortSignal;
}

export type JobHandlerFunction = (payload: Record<string, any>, ctx: JobExecutionContext) => Promise<Record<string, any> | void>;

export class JobHandlerRegistry {
  private handlers: Map<string, JobHandlerFunction> = new Map();

  register(name: string, handler: JobHandlerFunction): void {
    this.handlers.set(name.toLowerCase(), handler);
  }

  getHandler(name: string): JobHandlerFunction | undefined {
    return this.handlers.get(name.toLowerCase());
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name.toLowerCase());
  }
}
