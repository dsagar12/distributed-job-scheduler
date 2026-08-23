import { JobHandlerRegistry, JobExecutionContext } from './handler.registry';

export function registerBuiltInHandlers(registry: JobHandlerRegistry): void {
  // 1. Email Handler
  registry.register('send-email', async (payload: any, ctx: JobExecutionContext) => {
    await ctx.log('INFO', `Sending transactional email to recipient: ${payload.recipient || payload.email || 'user@example.com'}`);
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 200));
    await ctx.log('INFO', 'Email successfully delivered via mock SMTP gateway');
    return {
      messageId: `msg_${Date.now()}`,
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    };
  });

  // 2. Webhook Delivery Handler
  registry.register('send-webhook', async (payload: any, ctx: JobExecutionContext) => {
    const url = payload.url || payload.targetUrl || 'https://api.partner.io/webhook';
    await ctx.log('INFO', `Dispatching webhook payload to ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await ctx.log('INFO', 'Webhook delivery accepted (HTTP 200 OK)');
    return {
      httpStatus: 200,
      responseBody: { success: true },
      timestamp: new Date().toISOString(),
    };
  });

  // 3. Data Ingestion & ETL Handler
  registry.register('data-ingest', async (payload: any, ctx: JobExecutionContext) => {
    const rows = payload.rowCount || 1000;
    await ctx.log('INFO', `Transforming and ingesting dataset (${rows} rows)`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await ctx.log('INFO', `Ingestion completed successfully into data warehouse`);
    return {
      rowsIngested: rows,
      schemaVersion: 'v2',
      processedAt: new Date().toISOString(),
    };
  });

  // 4. Backup Chunk Handler
  registry.register('backup-chunk', async (payload: any, ctx: JobExecutionContext) => {
    await ctx.log('INFO', `Archiving chunk ${payload.chunkIndex || 1} to storage ${payload.targetS3 || 's3://backup'}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await ctx.log('INFO', 'Chunk compressed and uploaded with SHA256 integrity verified');
    return {
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      sizeBytes: 1048576,
      status: 'ARCHIVED',
    };
  });

  // 5. Simulated Failure Handler (for testing retries and DLQ)
  registry.register('simulate-failure', async (payload: any, ctx: JobExecutionContext) => {
    await ctx.log('WARN', `Executing simulate-failure test on attempt ${ctx.attempt}`);
    const shouldFail = payload.failUntilAttempt ? ctx.attempt < payload.failUntilAttempt : true;

    if (shouldFail) {
      const errorMsg = payload.errorMessage || `Simulated downstream API failure on attempt ${ctx.attempt}`;
      await ctx.log('ERROR', errorMsg);
      throw new Error(errorMsg);
    }

    await ctx.log('INFO', `Simulate-failure succeeded on attempt ${ctx.attempt}`);
    return {
      recovered: true,
      finalAttempt: ctx.attempt,
    };
  });

  // 6. Simulated Timeout Handler
  registry.register('simulate-timeout', async (payload: any, ctx: JobExecutionContext) => {
    const sleepMs = payload.sleepMs || 60000;
    await ctx.log('INFO', `Simulating long running task: sleeping for ${sleepMs}ms`);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, sleepMs);
      ctx.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Job aborted due to timeout or cancellation'));
      });
    });
    return { status: 'FINISHED_AFTER_LONG_WAIT' };
  });

  // 7. General Purpose / Default Handler
  registry.register('default', async (payload: any, ctx: JobExecutionContext) => {
    await ctx.log('INFO', `Processing generic job "${ctx.job.name}" with payload keys: ${Object.keys(payload).join(', ')}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await ctx.log('INFO', `Job execution finished successfully`);
    return {
      processed: true,
      timestamp: new Date().toISOString(),
    };
  });
}
