import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventLifecycleProcessor } from './event-lifecycle.processor';
import { EventModule } from '../../event/event.module';
import { QueueName } from '@eventify/shared-types';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.EVENT_LIFECYCLE }),
    EventModule,
  ],
  providers: [EventLifecycleProcessor],
})
export class EventLifecycleWorkerModule {}
