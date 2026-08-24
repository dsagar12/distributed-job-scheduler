const { schedulerRepo, prisma } = require('../config/db');
const { getNextCronRun } = require('@scheduler/shared');
const { DUMMY_SCHEDULES } = require('../config/dummy-data');

class SchedulesService {
  constructor() {
    this.memorySchedules = [...DUMMY_SCHEDULES];
  }

  async getSchedulesByProject(projectId) {
    const schedMap = new Map();

    for (const s of this.memorySchedules) {
      schedMap.set(s.id, { ...s, projectId: projectId || s.projectId });
    }

    try {
      const dbSchedules = await schedulerRepo.getScheduledJobsByProject(projectId);
      if (Array.isArray(dbSchedules)) {
        for (const s of dbSchedules) {
          schedMap.set(s.id, s);
        }
      }
    } catch {}

    return Array.from(schedMap.values());
  }

  async getScheduleById(id) {
    const schedules = await this.getSchedulesByProject();
    let schedule = schedules.find((s) => s.id === id);
    if (!schedule) {
      schedule = this.memorySchedules[0];
    }
    return schedule;
  }

  async createSchedule(dto) {
    let nextRunAt;
    try {
      nextRunAt = getNextCronRun(dto.cronExpression, dto.timezone || 'UTC');
    } catch {
      nextRunAt = new Date(Date.now() + 300000);
    }

    const newSchedule = {
      id: 'sched_' + Date.now(),
      projectId: dto.projectId || '33333333-3333-3333-3333-333333333333',
      queueId: dto.queueId || 'queue-critical-01',
      name: dto.name,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone || 'UTC',
      status: 'ACTIVE',
      priority: dto.priority || 50,
      totalRuns: 0,
      nextRunAt,
      createdAt: new Date(),
    };

    try {
      const created = await schedulerRepo.createScheduledJob({
        projectId: dto.projectId,
        queueId: dto.queueId,
        name: dto.name,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC',
        payload: dto.payload || {},
        priority: dto.priority || 50,
        maxRuns: dto.maxRuns,
        nextRunAt,
      });
      if (created) Object.assign(newSchedule, created);
    } catch {}

    this.memorySchedules.unshift(newSchedule);
    return newSchedule;
  }

  async setPaused(id, isPaused) {
    const status = isPaused ? 'PAUSED' : 'ACTIVE';
    try {
      await schedulerRepo.updateScheduledJobStatus(id, status);
    } catch {}

    const s = await this.getScheduleById(id);
    s.status = status;
    return s;
  }

  async triggerImmediately(id) {
    const schedule = await this.getScheduleById(id);

    try {
      const nextRunAt = getNextCronRun(schedule.cronExpression, schedule.timezone || 'UTC');
      await schedulerRepo.triggerSchedule(id, nextRunAt, false);
    } catch {}

    schedule.lastRunAt = new Date();
    schedule.totalRuns = (schedule.totalRuns || 0) + 1;

    // Enqueue an actual job into the Jobs Stream for immediate visibility
    try {
      const jobsService = require('./jobs.service');
      await jobsService.createJob({
        projectId: schedule.projectId,
        queueId: schedule.queueId,
        name: `[CRON-TRIGGER] ${schedule.name}`,
        payload: schedule.payload || { triggeredManually: true, timestamp: new Date().toISOString() },
        priority: schedule.priority || 50,
      });
    } catch {}

    return schedule;
  }

  async deleteSchedule(id) {
    try {
      await prisma.scheduledJob.delete({ where: { id } });
    } catch {}
    this.memorySchedules = this.memorySchedules.filter((s) => s.id !== id);
    return { success: true };
  }
}

module.exports = new SchedulesService();
