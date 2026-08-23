import { Module } from '@nestjs/common';
import { JobRepository } from '@scheduler/database';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  controllers: [JobsController],
  providers: [
    JobsService,
    {
      provide: JobRepository,
      useFactory: () => new JobRepository(),
    },
  ],
  exports: [JobsService],
})
export class JobsModule {}
