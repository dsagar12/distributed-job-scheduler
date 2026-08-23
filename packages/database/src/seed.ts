import { PrismaClient, OrgRole, JobStatus, RetryStrategy, ScheduledJobStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple sha256 or bcrypt hash simulation for seed if bcrypt is in api
function hashPassword(password: string): string {
  // We use standard sha256 with salt representation for seed consistency
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Clean existing seed data in correct foreign key order
  await prisma.jobLog.deleteMany();
  await prisma.jobExecution.deleteMany();
  await prisma.deadLetterJob.deleteMany();
  await prisma.batchJob.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.job.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.workerHeartbeat.deleteMany();
  await prisma.workerQueue.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.retryPolicy.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@scheduler.io',
      fullName: 'System Administrator',
      passwordHash: hashPassword('AdminSecurePass123!'),
      isActive: true,
    },
  });
  console.log(`✓ Created User: ${adminUser.email}`);

  // 3. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Cloud Platform',
      slug: 'acme-cloud',
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      role: OrgRole.OWNER,
    },
  });
  console.log(`✓ Created Organization: ${org.name} (${org.slug})`);

  // 4. Create Project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Production Ingestion Engine',
      slug: 'prod-ingestion',
      apiKey: 'proj_live_key_983749827394872394',
    },
  });
  console.log(`✓ Created Project: ${project.name}`);

  // 5. Create Retry Policies
  const expPolicy = await prisma.retryPolicy.create({
    data: {
      projectId: project.id,
      name: 'exponential-backoff',
      strategy: RetryStrategy.EXPONENTIAL,
      maxAttempts: 4,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
      backoffMultiplier: 2.0,
      jitter: true,
    },
  });

  const linearPolicy = await prisma.retryPolicy.create({
    data: {
      projectId: project.id,
      name: 'linear-fast',
      strategy: RetryStrategy.LINEAR,
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 1.0,
      jitter: false,
    },
  });
  console.log(`✓ Created Retry Policies: ${expPolicy.name}, ${linearPolicy.name}`);

  // 6. Create Queues
  const emailQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'email-notifications',
      description: 'Transactional email delivery with high priority and rate limit',
      priority: 100,
      concurrencyLimit: 10,
      rateLimitPerSecond: 50,
      defaultTimeoutMs: 15000,
      retryPolicyId: expPolicy.id,
    },
  });

  const dataQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'data-processing',
      description: 'Batch ETL and heavy data transformations',
      priority: 50,
      concurrencyLimit: 5,
      defaultTimeoutMs: 60000,
      retryPolicyId: expPolicy.id,
    },
  });

  const webhookQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'webhooks-outbound',
      description: 'Customer outbound webhook deliveries',
      priority: 80,
      concurrencyLimit: 8,
      defaultTimeoutMs: 10000,
      retryPolicyId: linearPolicy.id,
    },
  });
  console.log(`✓ Created Queues: ${emailQueue.name}, ${dataQueue.name}, ${webhookQueue.name}`);

  // 7. Seed Initial Jobs (Queued, Delayed, Completed, Failed/DLQ)
  // Immediate runnable jobs
  for (let i = 1; i <= 5; i++) {
    await prisma.job.create({
      data: {
        projectId: project.id,
        queueId: emailQueue.id,
        name: `Send Welcome Email #${i}`,
        payload: { userId: `usr_${i}`, template: 'welcome_v2', recipient: `user${i}@example.com` },
        priority: 100,
        status: JobStatus.QUEUED,
        runAt: new Date(),
        maxAttempts: 3,
        retryPolicyId: expPolicy.id,
      },
    });
  }

  // Delayed / Scheduled future jobs
  for (let i = 1; i <= 3; i++) {
    const runAt = new Date(Date.now() + i * 60 * 1000); // 1, 2, 3 mins in future
    await prisma.job.create({
      data: {
        projectId: project.id,
        queueId: dataQueue.id,
        name: `Scheduled Backup Chunk #${i}`,
        payload: { chunkIndex: i, targetS3: `s3://backups/chunk-${i}.tar.gz` },
        priority: 50,
        status: JobStatus.SCHEDULED,
        runAt,
        maxAttempts: 3,
        retryPolicyId: expPolicy.id,
      },
    });
  }

  // Recurring schedule definition (Cron)
  await prisma.scheduledJob.create({
    data: {
      projectId: project.id,
      queueId: dataQueue.id,
      name: 'Hourly Aggregation Cron',
      cronExpression: '0 * * * *',
      timezone: 'UTC',
      payload: { reportType: 'hourly_traffic_summary' },
      status: ScheduledJobStatus.ACTIVE,
      nextRunAt: new Date(Date.now() + 3600000),
    },
  });

  // Batch of jobs
  const batch = await prisma.batch.create({
    data: {
      projectId: project.id,
      name: 'Initial Data Ingestion Batch',
      status: 'PROCESSING',
      totalJobs: 3,
      completedJobs: 0,
      failedJobs: 0,
    },
  });

  for (let i = 1; i <= 3; i++) {
    const job = await prisma.job.create({
      data: {
        projectId: project.id,
        queueId: dataQueue.id,
        name: `Batch Ingest Part ${i}`,
        payload: { file: `dataset_part_${i}.csv`, rowCount: 5000 * i },
        priority: 50,
        status: JobStatus.QUEUED,
        runAt: new Date(),
        batchId: batch.id,
      },
    });
    await prisma.batchJob.create({
      data: {
        batchId: batch.id,
        jobId: job.id,
        orderIndex: i,
      },
    });
  }

  console.log('✓ Seeded initial jobs, scheduled cron, and batch successfully.');
  console.log('🎉 Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
