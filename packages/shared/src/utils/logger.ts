import { LogLevel } from '@scheduler/types';

export interface ILogContext {
  requestId?: string;
  jobId?: string;
  executionId?: string;
  workerId?: string;
  queueId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface IStructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: ILogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
    name?: string;
  };
}

export class AppLogger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private format(level: LogLevel, message: string, context?: ILogContext, error?: Error): string {
    const entry: IStructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(error
        ? {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : {}),
    };

    return JSON.stringify(entry);
  }

  debug(message: string, context?: ILogContext): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.format(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: ILogContext): void {
    console.log(this.format(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: ILogContext, error?: Error): void {
    console.warn(this.format(LogLevel.WARN, message, context, error));
  }

  error(message: string, context?: ILogContext, error?: Error): void {
    console.error(this.format(LogLevel.ERROR, message, context, error));
  }
}

export const createLogger = (serviceName: string): AppLogger => new AppLogger(serviceName);
