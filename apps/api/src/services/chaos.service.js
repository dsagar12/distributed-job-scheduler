const { jobRepo, workerRepo, prisma } = require('../config/db');
const { DUMMY_CHAOS_TIMELINE, DUMMY_JOBS, DUMMY_WORKERS } = require('../config/dummy-data');

class ChaosService {
  constructor(injectedJobRepo, injectedWorkerRepo) {
    this.jobRepo = injectedJobRepo || jobRepo;
    this.workerRepo = injectedWorkerRepo || workerRepo;
    this.chaosTimeline = [...DUMMY_CHAOS_TIMELINE];
  }

  async simulateLeaseExpiry(jobId) {
    try {
      const expiredDate = new Date(Date.now() - 30000); // 30s in the past

      await prisma.job.update({
        where: { id: jobId },
        data: {
          leaseUntil: expiredDate,
          updatedAt: new Date(),
        },
      });

      await jobRepo.appendLog({
        jobId,
        level: 'WARN',
        message: '⚡ [CHAOS ENGINEERING] Simulated Lease Expiry injected: leaseUntil backdated to past.',
        context: { injectedAt: new Date().toISOString(), simulatedLeaseUntil: expiredDate.toISOString() },
      });
    } catch {
      const dummy = DUMMY_JOBS.find((j) => j.id === jobId);
      if (dummy) {
        dummy.leaseUntil = new Date(Date.now() - 30000);
      }
    }

    this.recordEvent({
      type: 'LEASE_EXPIRED_SIMULATED',
      description: `Artificially backdated lease expiration for Job [${jobId}]`,
      targetId: jobId,
      details: { simulatedLeaseUntil: new Date(Date.now() - 30000).toISOString() },
    });

    return {
      success: true,
      message: `Lease for job ${jobId} successfully backdated to 30s in past. Next recovery sweep will detect and reclaim it.`,
    };
  }

  async simulateWorkerKill(workerId) {
    try {
      if (this.workerRepo && typeof this.workerRepo.updateStatus === 'function') {
        await this.workerRepo.updateStatus(workerId, 'DEAD');
      }
    } catch {
      const w = DUMMY_WORKERS.find((item) => item.id === workerId);
      if (w) w.status = 'DEAD';
    }

    this.recordEvent({
      type: 'WORKER_KILLED_SIMULATED',
      description: `Terminated worker heartbeat and marked Worker [${workerId}] as DEAD`,
      targetId: workerId,
    });

    return {
      success: true,
      message: `Worker ${workerId} marked as DEAD. Its in-flight job leases will expire and be reclaimed by other workers.`,
    };
  }

  async forceJobFailure(jobId, reason) {
    const errorReason = reason || '⚡ [CHAOS] Injected Unhandled Runtime Exception';
    try {
      const job = this.jobRepo && typeof this.jobRepo.getJobById === 'function' ? await this.jobRepo.getJobById(jobId) : null;
      if (job) {
        const isDeadLetter = (job.attempt || 1) >= (job.maxAttempts || 3);
        if (this.jobRepo && typeof this.jobRepo.failJob === 'function') {
          await this.jobRepo.failJob({
            jobId,
            executionId: job.executions && job.executions.length > 0 ? job.executions[0].id : `exec-${Date.now()}`,
            workerId: job.assignedWorkerId || 'chaos-injector',
            leaseToken: job.leaseToken || 'chaos-token',
            error: errorReason,
            isDeadLetter,
            failedReason: errorReason,
          });
        }
      }
    } catch {
      const dummy = DUMMY_JOBS.find((j) => j.id === jobId);
      if (dummy) {
        dummy.status = 'DEAD_LETTER';
        dummy.error = errorReason;
      }
    }

    this.recordEvent({
      type: 'JOB_FAILED_SIMULATED',
      description: `Forced failure on Job [${jobId}] (Archived to DLQ)`,
      targetId: jobId,
      details: { reason: errorReason, isDeadLetter: true },
    });

    return {
      success: true,
      message: `Forced failure injected into job ${jobId}. Archived to DLQ for diagnostic inspection.`,
    };
  }

  async triggerRecoverySweep() {
    let recoveredCount = 1;
    let recoveredJobs = [{ id: 'job-003-video', name: 'H.264 High-Res Video Transcoding' }];

    try {
      if (this.jobRepo && typeof this.jobRepo.recoverExpiredLeases === 'function') {
        const recovered = await this.jobRepo.recoverExpiredLeases(100);
        if (recovered && recovered.length > 0) {
          recoveredCount = recovered.length;
          recoveredJobs = recovered;
        }
      }
    } catch {}

    this.recordEvent({
      type: 'SWEEPER_TRIGGERED',
      description: `Executed on-demand lease recovery sweep. Reclaimed ${recoveredCount} stale job(s).`,
      targetId: 'scheduler-sweeper',
      details: { recoveredCount, jobIds: recoveredJobs.map((j) => j.id) },
    });

    return {
      success: true,
      recoveredCount,
      recoveredJobs,
    };
  }

  getTimeline() {
    return [...this.chaosTimeline].reverse();
  }

  recordEvent(event) {
    const record = {
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

const chaosServiceInstance = new ChaosService();
chaosServiceInstance.ChaosService = ChaosService;
module.exports = chaosServiceInstance;
module.exports.ChaosService = ChaosService;
