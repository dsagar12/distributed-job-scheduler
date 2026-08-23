import { Module } from '@nestjs/common';
import { ChaosController } from './chaos.controller';
import { ChaosService } from './chaos.service';
import { JobRepository, WorkerRepository } from '@scheduler/database';

@Module({
  controllers: [ChaosController],
  providers: [ChaosService, JobRepository, WorkerRepository],
  exports: [ChaosService],
})
export class ChaosModule {}
