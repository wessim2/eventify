import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  InjectQueue,
} from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { EventService } from '../../event/event.service';
import { QueueName } from '@eventify/shared-types';
import { Env } from '../../config/env.schema';

const EVENT_LIFECYCLE_JOB_NAME = 'complete-past-due-events';
const EVENT_LIFECYCLE_JOB_ID = 'repeatable-event-lifecycle';

/**
 * EventLifecycleProcessor — scheduled worker that automatically transitions
 * past-due published events to COMPLETED.
 *
 * This is a SYSTEM-LEVEL worker — it operates across ALL tenants.
 * It does not use RLS (requires admin-level Prisma access).
 * The EventService methods it calls (findPastDuePublishedEvents, markCompleted)
 * bypass tenant filtering deliberately.
 *
 * On startup: registers itself as a repeatable BullMQ job.
 * On each tick: queries for past-due events → marks them COMPLETED → logs count.
 */
@Processor(QueueName.EVENT_LIFECYCLE, { concurrency: 1 })
export class EventLifecycleProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EventLifecycleProcessor.name);

  constructor(
    private readonly eventService: EventService,
    private readonly configService: ConfigService<Env, true>,
    @InjectQueue(QueueName.EVENT_LIFECYCLE)
    private readonly lifecycleQueue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const intervalMs = this.configService.get('EVENT_LIFECYCLE_INTERVAL_MS', {
      infer: true,
    });

    // Remove any stale repeatable job first (prevents duplicate registrations on restart)
    const repeatableJobs = await this.lifecycleQueue.getRepeatableJobs();
    const stale = repeatableJobs.find((j) => j.name === EVENT_LIFECYCLE_JOB_NAME);
    if (stale) {
      await this.lifecycleQueue.removeRepeatableByKey(stale.key);
    }

    await this.lifecycleQueue.add(
      EVENT_LIFECYCLE_JOB_NAME,
      {},
      {
        repeat: { every: intervalMs },
        jobId: EVENT_LIFECYCLE_JOB_ID,
      },
    );

    this.logger.log(
      `Event lifecycle worker registered — runs every ${intervalMs / 1000}s`,
    );
  }

  async process(job: Job): Promise<{ transitioned: number }> {
    this.logger.debug('Running event lifecycle check...');

    const pastDueEvents = await this.eventService.findPastDuePublishedEvents();

    if (pastDueEvents.length === 0) {
      this.logger.debug('No past-due events found');
      return { transitioned: 0 };
    }

    let transitioned = 0;
    for (const event of pastDueEvents) {
      try {
        await this.eventService.markCompleted(event.id);
        transitioned++;
        this.logger.log(
          `Event ${event.id} ("${event.title}") transitioned PUBLISHED → COMPLETED`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to transition event ${event.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Event lifecycle run complete: ${transitioned}/${pastDueEvents.length} events transitioned`,
    );
    return { transitioned };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Event lifecycle job failed (attempt ${job.attemptsMade})`,
      error.stack,
    );
  }
}
