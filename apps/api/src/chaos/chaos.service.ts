import { Injectable } from '@nestjs/common';
import { JobRepository, WorkerRepository, getPrismaClient } from '@scheduler/database';
import { WorkerStatus, LogLevel } from '@prisma/client';
import { ChaosEventRecord } from '@scheduler/types';

@Injectable()
export class ChaosService {
  private readonly prisma = getPrismaClient();
  private readonly chaosTimeline: ChaosEventRecord[] = [];

  constructor(
    private readonly jobRepo: JobRepository,
    private readonly workerRepo: WorkerRepository,
  ) {}

  /**
   * Simulates lease expiry by backdating the leaseUntil timestamp of a RUNNING or CLAIMED job.
   */
  async simulateLeaseExpiry(jobId: string): Promise<{ success: boolean; message: string; previousLeaseUntil?: Date }> {
    try {
      const expiredDate = new Date(Date.now() - 30000); // 30s in the past

      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          leaseUntil: expiredDate,
          updatedAt: new Date(),
        },
      });

      await this.jobRepo.appendLog({
        jobId,
        level: LogLevel.WARN,
        message: '⚡ [CHAOS ENGINEERING] Simulated Lease Expiry injected: leaseUntil backdated to past.',
        context: { injectedAt: new Date().toISOString(), simulatedLeaseUntil: expiredDate.toISOString() },
      });

      this.recordEvent({
        type: 'LEASE_EXPIRED_SIMULATED',
        description: `Artificially backdated lease expiration for Job [${jobId}]`,
        targetId: jobId,
        details: { simulatedLeaseUntil: expiredDate.toISOString() },
      });

      return {
        success: true,
        message: `Lease for job ${jobId} successfully backdated to ${expiredDate.toISOString()}. Next recovery sweep will detect and reclaim it.`,
      };
    } catch {
      // Offline fallback
      const job = await this.jobRepo.getJobById(jobId);
      if (job) {
        job.leaseUntil = new Date(Date.now() - 30000);
      }

      this.recordEvent({
        type: 'LEASE_EXPIRED_SIMULATED',
        description: `Artificially backdated lease expiration for Job [${jobId}]`,
        targetId: jobId,
      });

      return {
        success: true,
        message: `Lease for job ${jobId} backdated (offline store).`,
      };
    }
  }

  /**
   * Simulates worker process crash/hang by abruptly setting status to DEAD and clearing active states.
   */
  async simulateWorkerKill(workerId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.workerRepo.updateStatus(workerId, WorkerStatus.DEAD);

      this.recordEvent({
        type: 'WORKER_KILLED_SIMULATED',
        description: `Terminated worker heartbeat and marked Worker [${workerId}] as DEAD`,
        targetId: workerId,
      });

      return {
        success: true,
        message: `Worker ${workerId} marked as DEAD. Its in-flight job leases will expire and be reclaimed by other workers.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Injects an immediate execution failure into an active or queued job.
   */
  async forceJobFailure(jobId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const errorReason = reason || '⚡ [CHAOS] Injected Unhandled Runtime Exception';
    try {
      const job = await this.jobRepo.getJobById(jobId);
      if (!job) {
        return { success: false, message: `Job ${jobId} not found` };
      }

      const isDeadLetter = (job.attempt || 1) >= (job.maxAttempts || 3);
      await this.jobRepo.failJob({
        jobId,
        executionId: job.executions && job.executions.length > 0 ? job.executions[0].id : `exec-${Date.now()}`,
        workerId: job.assignedWorkerId || 'chaos-injector',
        leaseToken: job.leaseToken || 'chaos-token',
        error: errorReason,
        isDeadLetter,
        failedReason: errorReason,
      });

      this.recordEvent({
        type: 'JOB_FAILED_SIMULATED',
        description: `Forced failure on Job [${jobId}] (${isDeadLetter ? 'Archived to DLQ' : 'Scheduled for Retry'})`,
        targetId: jobId,
        details: { reason: errorReason, isDeadLetter },
      });

      return {
        success: true,
        message: `Forced failure injected into job ${jobId}. ${isDeadLetter ? 'Max attempts reached -> Archived to DLQ.' : 'Job queued for retry.'}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Manually triggers the crash recovery sweeper to reclaim all expired leases.
   */
  async triggerRecoverySweep(): Promise<{ success: boolean; recoveredCount: number; recoveredJobs: any[] }> {
    const recovered = await this.jobRepo.recoverExpiredLeases(100);

    this.recordEvent({
      type: 'SWEEPER_TRIGGERED',
      description: `Executed on-demand lease recovery sweep. Reclaimed ${recovered.length} stale job(s).`,
      targetId: 'scheduler-sweeper',
      details: { recoveredCount: recovered.length, jobIds: recovered.map((j) => j.id) },
    });

    return {
      success: true,
      recoveredCount: recovered.length,
      recoveredJobs: recovered,
    };
  }

  getTimeline(): ChaosEventRecord[] {
    return [...this.chaosTimeline].reverse();
  }

  private recordEvent(event: Omit<ChaosEventRecord, 'id' | 'timestamp'>): void {
    const record: ChaosEventRecord = {
      ...event,
      id: `chaos-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.chaosTimeline.push(record);
    if (this.chaosTimeline.length > 100) {
      this.chaosTimeline.shift();
    }
  }
}
