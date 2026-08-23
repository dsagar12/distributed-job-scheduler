import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { JobRepository, QueueRepository, MetricsRepository } from '@scheduler/database';

@Module({
  controllers: [SimulatorController],
  providers: [SimulatorService, JobRepository, QueueRepository, MetricsRepository],
  exports: [SimulatorService],
})
export class SimulatorModule {}
