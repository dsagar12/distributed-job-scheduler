import { Module } from '@nestjs/common';
import { JobRepository } from '@scheduler/database';
import { DlqService } from './dlq.service';
import { DlqController } from './dlq.controller';

@Module({
  controllers: [DlqController],
  providers: [
    DlqService,
    {
      provide: JobRepository,
      useFactory: () => new JobRepository(),
    },
  ],
  exports: [DlqService],
})
export class DlqModule {}
