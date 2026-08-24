const {
  getPrismaClient,
  JobRepository,
  QueueRepository,
  WorkerRepository,
  SchedulerRepository,
  BatchRepository,
  UserRepository,
  MetricsRepository,
} = require('@scheduler/database');

const prisma = getPrismaClient();

const jobRepo = new JobRepository();
const queueRepo = new QueueRepository();
const workerRepo = new WorkerRepository();
const schedulerRepo = new SchedulerRepository();
const batchRepo = new BatchRepository();
const userRepo = new UserRepository();
const metricsRepo = new MetricsRepository();

module.exports = {
  prisma,
  jobRepo,
  queueRepo,
  workerRepo,
  schedulerRepo,
  batchRepo,
  userRepo,
  metricsRepo,
};
