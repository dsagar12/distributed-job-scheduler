import { Module } from '@nestjs/common';
import { QueueRepository } from '@scheduler/database';
import { QueuesService } from './queues.service';
import { QueuesController } from './queues.controller';

@Module({
  controllers: [QueuesController],
  providers: [
    QueuesService,
    {
      provide: QueueRepository,
      useFactory: () => new QueueRepository(),
    },
  ],
  exports: [QueuesService],
})
export class QueuesModule {}
