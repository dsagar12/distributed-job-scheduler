import { Module } from '@nestjs/common';
import { SchedulerRepository } from '@scheduler/database';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    {
      provide: SchedulerRepository,
      useFactory: () => new SchedulerRepository(),
    },
  ],
  exports: [SchedulesService],
})
export class SchedulesModule {}
