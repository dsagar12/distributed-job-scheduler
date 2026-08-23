import { Module } from '@nestjs/common';
import { BatchRepository } from '@scheduler/database';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';

@Module({
  controllers: [BatchesController],
  providers: [
    BatchesService,
    {
      provide: BatchRepository,
      useFactory: () => new BatchRepository(),
    },
  ],
  exports: [BatchesService],
})
export class BatchesModule {}
