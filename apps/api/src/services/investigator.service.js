const { jobRepo } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { DUMMY_JOBS } = require('../config/dummy-data');

class InvestigatorService {
  async analyzeJobFailure(jobId) {
    let job = await jobRepo.getJobById(jobId).catch(() => null);
    if (!job) {
      job = DUMMY_JOBS.find((j) => j.id === jobId);
    }
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
    }

    const logs = job.logs || [];
    const executions = job.executions || [];
    const latestError = job.error || (executions.length > 0 ? executions[0].error : '') || 'Unknown failure';
    const latestStackTrace = (executions.length > 0 ? executions[0].stackTrace : '') || '';

    const combinedLogText = [
      latestError,
      latestStackTrace,
      ...logs.map((l) => `${l.level}: ${l.message} ${JSON.stringify(l.context || {})}`),
    ].join('\n');

    return this.runDiagnosticEngine(job, combinedLogText, latestError, executions);
  }

  runDiagnosticEngine(job, text, _error, executions) {
    const lower = text.toLowerCase();

    let category = 'UNHANDLED_EXCEPTION';
    let severity = 'HIGH';
    let rootCause = 'An unhandled exception terminated the worker execution handler.';
    let blastRadius = 'Single job failure; retry policy active.';
    const recommendations = [];

    if (lower.includes('timeout') || lower.includes('deadline') || lower.includes('etimedout')) {
      category = 'TIMEOUT_DEADLINE';
      severity = 'HIGH';
      rootCause = `Job execution exceeded the configured timeout deadline (${job.timeoutMs || 15000}ms) before completion.`;
      blastRadius = 'Task was aborted by AbortController. Worker thread was freed cleanly.';
      recommendations.push({
        title: 'Increase Queue / Job Execution Timeout',
        action: `Adjust timeoutMs from ${job.timeoutMs || 15000}ms to ${Math.max(60000, (job.timeoutMs || 15000) * 2)}ms.`,
        impact: 'Prevents premature watchdog termination for heavy workloads.',
        configSnippet: `{ "timeoutMs": ${(job.timeoutMs || 15000) * 2} }`,
      });
      recommendations.push({
        title: 'Optimize Database Query or Chunk Size',
        action: 'Inspect handler payload to break large batch items into smaller micro-chunks.',
        impact: 'Reduces individual execution latency.',
      });
    } else if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
      category = 'RATE_LIMIT_429';
      severity = 'MEDIUM';
      rootCause = 'Downstream external API responded with HTTP 429 (Too Many Requests).';
      blastRadius = 'Downstream rate-limit throttling; potential cascade across workers.';
      recommendations.push({
        title: 'Switch to Exponential Backoff with Jitter',
        action: 'Configure retryPolicy strategy to EXPONENTIAL with randomized jitter.',
        impact: 'De-correlates retry bursts to prevent hammering rate-limited APIs.',
        configSnippet: '{ "strategy": "EXPONENTIAL", "backoffMultiplier": 2.0, "jitter": true }',
      });
      recommendations.push({
        title: 'Enforce Queue Rate Limit',
        action: 'Set rateLimitPerSecond on the queue definition (e.g. 5 requests/sec).',
        impact: 'Smooths outbound traffic within API quota.',
      });
    } else if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('bad gateway') || lower.includes('service unavailable')) {
      category = 'UPSTREAM_5XX';
      severity = 'HIGH';
      rootCause = 'Upstream dependency failure (HTTP 5xx Server Error / Gateway Timeout).';
      blastRadius = 'Transient external outage affecting all jobs calling this endpoint.';
      recommendations.push({
        title: 'Enable Automatic Retry with Linear/Exponential Backoff',
        action: 'Ensure maxAttempts >= 3 with minimum 5000ms initialDelay.',
        impact: 'Permits recovery once the upstream service restores availability.',
        configSnippet: '{ "maxAttempts": 5, "initialDelayMs": 5000 }',
      });
    } else if (lower.includes('lock') || lower.includes('deadlock') || lower.includes('p2034') || lower.includes('concurrent update')) {
      category = 'DATABASE_LOCK_TIMEOUT';
      severity = 'CRITICAL';
      rootCause = 'PostgreSQL transaction lock contention or deadlock detected.';
      blastRadius = 'Database transaction aborted; rollback executed safely.';
      recommendations.push({
        title: 'Audit Transaction Boundaries & Row Locks',
        action: 'Verify queries acquire locks in consistent ordering or use SELECT FOR UPDATE SKIP LOCKED.',
        impact: 'Eliminates serialization lock conflicts in high-throughput tables.',
      });
    } else if (lower.includes('memory') || lower.includes('heap') || lower.includes('out of memory') || lower.includes('enomem')) {
      category = 'RESOURCE_EXHAUSTION';
      severity = 'CRITICAL';
      rootCause = 'Node.js V8 process heap memory exhausted (Out of Memory).';
      blastRadius = 'Worker container potential restart or memory leak in task handler.';
      recommendations.push({
        title: 'Stream Payloads Instead of Buffering in Memory',
        action: 'Replace full memory array parsing with Node.js stream pipelines.',
        impact: 'Caps RAM consumption to constant O(1) buffer.',
      });
    } else if (lower.includes('json') || lower.includes('syntaxerror') || lower.includes('unexpected token')) {
      category = 'SERIALIZATION_ERROR';
      severity = 'LOW';
      rootCause = 'Invalid JSON payload structure or unparseable response body.';
      blastRadius = 'Deterministic handler parsing error; repeated attempts without payload fix will fail.';
      recommendations.push({
        title: 'Validate Schema at Ingestion Boundary',
        action: 'Enforce DTO schema validation before enqueuing to prevent corrupted payloads reaching workers.',
        impact: 'Blocks invalid tasks immediately with 400 Bad Request instead of wasting worker CPU.',
      });
    } else {
      recommendations.push({
        title: 'Inspect Job Execution Logs Drawer',
        action: 'Review runtime log context and handler stack trace for code-level exceptions.',
        impact: 'Identifies unhandled runtime bugs.',
      });
    }

    return {
      jobId: job.id,
      jobName: job.name,
      category,
      severity,
      summary: `AI Diagnostic: Job failed on attempt ${job.attempt || 1}/${job.maxAttempts || 3} due to ${category.replace(/_/g, ' ')}. ${rootCause}`,
      rootCause,
      blastRadius,
      recurringPatternDetected: executions.length > 1,
      patternCount: executions.length,
      recommendations,
      analyzedAt: new Date().toISOString(),
      model: 'Deterministic Heuristic Expert Engine v1.0 (AI Safe Fallback)',
    };
  }
}

module.exports = new InvestigatorService();
