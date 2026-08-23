import { Module } from '@nestjs/common';
import { MetricsRepository, QueueRepository } from '@scheduler/database';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: MetricsRepository,
      useFactory: () => new MetricsRepository(),
    },
    {
      provide: QueueRepository,
      useFactory: () => new QueueRepository(),
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
