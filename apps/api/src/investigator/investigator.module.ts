import { Module } from '@nestjs/common';
import { InvestigatorController } from './investigator.controller';
import { InvestigatorService } from './investigator.service';
import { JobRepository } from '@scheduler/database';

@Module({
  controllers: [InvestigatorController],
  providers: [InvestigatorService, JobRepository],
  exports: [InvestigatorService],
})
export class InvestigatorModule {}
