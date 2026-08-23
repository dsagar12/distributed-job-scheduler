import { Module } from '@nestjs/common';
import { WorkerRepository } from '@scheduler/database';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';

@Module({
  controllers: [WorkersController],
  providers: [
    WorkersService,
    {
      provide: WorkerRepository,
      useFactory: () => new WorkerRepository(),
    },
  ],
  exports: [WorkersService],
})
export class WorkersModule {}
