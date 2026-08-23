import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { QueuesModule } from './queues/queues.module';
import { JobsModule } from './jobs/jobs.module';
import { BatchesModule } from './batches/batches.module';
import { SchedulesModule } from './schedules/schedules.module';
import { WorkersModule } from './workers/workers.module';
import { DlqModule } from './dlq/dlq.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { ChaosModule } from './chaos/chaos.module';
import { InvestigatorModule } from './investigator/investigator.module';
import { SimulatorModule } from './simulator/simulator.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    QueuesModule,
    JobsModule,
    BatchesModule,
    SchedulesModule,
    WorkersModule,
    DlqModule,
    MetricsModule,
    HealthModule,
    EventsModule,
    ChaosModule,
    InvestigatorModule,
    SimulatorModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
