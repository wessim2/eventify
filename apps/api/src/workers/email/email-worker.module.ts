import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { QueueName } from '@eventify/shared-types';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EMAIL })],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
