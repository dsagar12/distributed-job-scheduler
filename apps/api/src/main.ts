import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

const logger = new Logger('API_BOOTSTRAP');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-organization-id', 'x-project-id', 'x-api-key', 'Accept'],
    },
  });

  // Global exception filter and response transform interceptor
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI Interactive Documentation
  const config = new DocumentBuilder()
    .setTitle('Distributed Job Scheduler API Gateway')
    .setDescription(
      'Enterprise-grade Distributed Background Job Scheduling & Orchestration Platform. ' +
        'Built with NestJS, PostgreSQL (Authoritative Source of Truth with FOR UPDATE SKIP LOCKED & Lease Fencing), ' +
        'and Redis Coordination.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT login, register, token rotation, user profile')
    .addTag('Organizations', 'Multi-tenant organization management')
    .addTag('Projects', 'Project isolation and API key generation')
    .addTag('Queues', 'Queue configuration, concurrency bounds, pause/resume')
    .addTag('Jobs', 'Job lifecycle, creation with idempotency, logs, executions, and cancellation')
    .addTag('Batches', 'Atomic batch creation and aggregated progress tracking')
    .addTag('Schedules', 'Recurring cron schedules and delayed job definitions')
    .addTag('Workers', 'Worker fleet monitoring and heartbeat telemetry')
    .addTag('Dead Letter Queue', 'Failed job inspection and dead-letter reprocessing')
    .addTag('Metrics & Observability', 'Cluster-wide metrics, throughput timeline, and latency percentiles')
    .addTag('Health & Readiness', 'Kubernetes & container health probes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Job Scheduler API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Distributed Job Scheduler API Gateway running on: http://localhost:${port}`);
  logger.log(`📚 OpenAPI / Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`⚡ WebSocket Gateway namespace active at: /events`);
}

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Failed to bootstrap API Gateway', err);
    process.exit(1);
  });
}

export { bootstrap };
