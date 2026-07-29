import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Env } from '../config/env.schema';
import { QueueName } from '@eventify/shared-types';

/**
 * QueueModule — registers BullMQ connection and all named queues.
 * Processors live in workers/ — they import their queue by name only.
 * Bull Board is mounted at /admin/queues for development visibility.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),

    // Register all queues
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.EVENT_LIFECYCLE },
      { name: QueueName.PAYMENT },
    ),

    // Bull Board — dev-only queue dashboard at /admin/queues
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueName.EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueName.EVENT_LIFECYCLE,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueName.PAYMENT,
      adapter: BullMQAdapter,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
