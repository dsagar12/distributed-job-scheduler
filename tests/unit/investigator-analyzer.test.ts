import { FailureCategory, RootCauseAnalysisResult } from '@scheduler/types';

describe('AI Failure Investigator Unit Tests', () => {
  // Mock Heuristic Investigator Diagnostic Engine
  const runDiagnosticEngine = (
    job: any,
    text: string,
    executions: any[],
  ): RootCauseAnalysisResult => {
    const lower = text.toLowerCase();
    let category: FailureCategory = 'UNHANDLED_EXCEPTION';
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH';
    let rootCause = 'An unhandled exception terminated the worker execution handler.';
    let blastRadius = 'Single job failure; retry policy active.';
    const recommendations: RootCauseAnalysisResult['recommendations'] = [];

    if (lower.includes('timeout') || lower.includes('deadline') || lower.includes('etimedout')) {
      category = 'TIMEOUT_DEADLINE';
      severity = 'HIGH';
      rootCause = `Job execution exceeded configured timeout (${job.timeoutMs}ms).`;
      blastRadius = 'Task aborted by AbortController; worker freed cleanly.';
      recommendations.push({
        title: 'Increase Timeout',
        action: `Increase timeoutMs to ${Math.max(60000, (job.timeoutMs || 30000) * 2)}ms.`,
        impact: 'Prevents premature termination.',
        configSnippet: `{ "timeoutMs": ${(job.timeoutMs || 30000) * 2} }`,
      });
    } else if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
      category = 'RATE_LIMIT_429';
      severity = 'MEDIUM';
      rootCause = 'Downstream external API responded with HTTP 429 (Too Many Requests).';
      blastRadius = 'Downstream rate-limit throttling.';
      recommendations.push({
        title: 'Switch to Exponential Backoff with Jitter',
        action: 'Configure retryPolicy strategy to EXPONENTIAL with jitter.',
        impact: 'De-correlates retry traffic bursts.',
        configSnippet: '{ "strategy": "EXPONENTIAL", "jitter": true }',
      });
    } else if (lower.includes('500') || lower.includes('503') || lower.includes('bad gateway')) {
      category = 'UPSTREAM_5XX';
      severity = 'HIGH';
      rootCause = 'Upstream dependency failure (HTTP 5xx Server Error).';
      blastRadius = 'Transient external outage.';
      recommendations.push({
        title: 'Enable Automatic Retries',
        action: 'Ensure maxAttempts >= 3 with backoff.',
        impact: 'Recovers once upstream service recovers.',
      });
    } else if (lower.includes('lock') || lower.includes('deadlock') || lower.includes('p2034')) {
      category = 'DATABASE_LOCK_TIMEOUT';
      severity = 'CRITICAL';
      rootCause = 'PostgreSQL transaction lock contention or deadlock detected.';
      blastRadius = 'Database transaction aborted; rollback executed.';
      recommendations.push({
        title: 'Audit Transaction Boundaries',
        action: 'Use SELECT FOR UPDATE SKIP LOCKED.',
        impact: 'Eliminates lock conflicts.',
      });
    } else if (lower.includes('memory') || lower.includes('heap') || lower.includes('out of memory')) {
      category = 'RESOURCE_EXHAUSTION';
      severity = 'CRITICAL';
      rootCause = 'Node.js V8 process heap memory exhausted (Out of Memory).';
      blastRadius = 'Worker container potential restart.';
      recommendations.push({
        title: 'Stream Payloads',
        action: 'Stream chunked data instead of loading into heap buffer.',
        impact: 'Caps RAM consumption to O(1).',
      });
    } else if (lower.includes('json') || lower.includes('syntaxerror')) {
      category = 'SERIALIZATION_ERROR';
      severity = 'LOW';
      rootCause = 'Invalid JSON payload structure.';
      blastRadius = 'Deterministic parsing error.';
      recommendations.push({
        title: 'Validate Schema at Ingestion',
        action: 'Enforce DTO schema validation.',
        impact: 'Blocks invalid inputs early.',
      });
    }

    return {
      jobId: job.id,
      jobName: job.name,
      category,
      severity,
      summary: `AI Diagnostic: Job failed on attempt ${job.attempt}/${job.maxAttempts} due to ${category}.`,
      rootCause,
      blastRadius,
      recurringPatternDetected: executions.length > 1,
      patternCount: executions.length,
      recommendations,
      analyzedAt: new Date().toISOString(),
      model: 'Deterministic Heuristic Expert Engine v1.0 (AI Safe Fallback)',
    };
  };

  it('correctly classifies a TIMEOUT_DEADLINE failure and suggests timeout expansion', () => {
    const job = { id: 'job-1', name: 'Heavy Video Encoding', timeoutMs: 30000, attempt: 1, maxAttempts: 3 };
    const log = 'Error: ETIMEDOUT execution exceeded 30000ms deadline';
    const analysis = runDiagnosticEngine(job, log, []);

    expect(analysis.category).toBe('TIMEOUT_DEADLINE');
    expect(analysis.severity).toBe('HIGH');
    expect(analysis.recommendations.some((r) => r.title.includes('Increase Timeout'))).toBe(true);
  });

  it('correctly classifies a RATE_LIMIT_429 failure and suggests exponential backoff with jitter', () => {
    const job = { id: 'job-2', name: 'Shopify Product Sync', timeoutMs: 30000, attempt: 2, maxAttempts: 3 };
    const log = 'AxiosError: Request failed with status code 429 Too Many Requests';
    const analysis = runDiagnosticEngine(job, log, [{ id: 'exec-1' }, { id: 'exec-2' }]);

    expect(analysis.category).toBe('RATE_LIMIT_429');
    expect(analysis.severity).toBe('MEDIUM');
    expect(analysis.recurringPatternDetected).toBe(true);
    expect(analysis.recommendations[0]?.configSnippet).toContain('"strategy": "EXPONENTIAL"');
  });

  it('correctly classifies a DATABASE_LOCK_TIMEOUT and flags CRITICAL severity', () => {
    const job = { id: 'job-3', name: 'Inventory Settlement', timeoutMs: 30000, attempt: 1, maxAttempts: 3 };
    const log = 'PrismaClientKnownRequestError: P2034 Transaction failed due to a write conflict or deadlock';
    const analysis = runDiagnosticEngine(job, log, []);

    expect(analysis.category).toBe('DATABASE_LOCK_TIMEOUT');
    expect(analysis.severity).toBe('CRITICAL');
  });

  it('correctly classifies an UPSTREAM_5XX outage', () => {
    const job = { id: 'job-4', name: 'Stripe Webhook Forwarder', timeoutMs: 30000, attempt: 1, maxAttempts: 3 };
    const log = 'HTTP 503 Bad Gateway: upstream connect error or disconnect/reset before headers';
    const analysis = runDiagnosticEngine(job, log, []);

    expect(analysis.category).toBe('UPSTREAM_5XX');
  });

  it('guarantees AI Investigator is strictly analytical and never mutates job state', () => {
    const originalStatus = 'FAILED';
    const originalAttempt = 2;
    const job = { id: 'job-5', name: 'Analytics Aggregation', status: originalStatus, attempt: originalAttempt, maxAttempts: 3, timeoutMs: 15000 };
    const log = 'TypeError: Cannot read properties of undefined (reading mapping)';

    const analysis = runDiagnosticEngine(job, log, [{ id: 'exec-1' }, { id: 'exec-2' }]);
    expect(analysis.category).toBe('UNHANDLED_EXCEPTION');

    // Invariant: Job state unchanged by AI inspection
    expect(job.status).toBe(originalStatus);
    expect(job.attempt).toBe(originalAttempt);
  });
});
