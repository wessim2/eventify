import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module';
import { PaymentProcessor } from './payment.processor';

@Module({
  imports: [QueueModule],
  providers: [PaymentProcessor],
})
export class PaymentWorkerModule {}
