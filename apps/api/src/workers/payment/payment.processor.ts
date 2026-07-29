import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { QueueName, EmailJobType } from '@eventify/shared-types';
import { AdminPrismaService } from '../../prisma/admin-prisma.service';
import { RegistrationStatus } from '@prisma/client';

export interface PaymentJobPayload {
  registrationId: string;
  paymentIntentId: string;
  shouldFail?: boolean;
}

@Processor(QueueName.PAYMENT, {
  concurrency: 5,
})
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly adminPrisma: AdminPrismaService,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PaymentJobPayload>): Promise<void> {
    const { registrationId, paymentIntentId, shouldFail } = job.data;
    this.logger.log(`Processing payment for registration ${registrationId} (Intent: ${paymentIntentId})`);

    // Simulate payment processing delay (1.5 seconds, skip in test mode)
    const delay = process.env.NODE_ENV === 'test' ? 0 : 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const isFailed = shouldFail !== undefined ? shouldFail : Math.random() < 0.10;

    if (isFailed) {
      this.logger.warn(`Payment failed for registration ${registrationId}. Rolling back inventory.`);
      
      await this.adminPrisma.$transaction(async (tx: any) => {
        const reg = await tx.registration.update({
          where: { id: registrationId },
          data: { status: RegistrationStatus.FAILED },
        });

        await tx.ticketType.update({
          where: { id: reg.ticketTypeId },
          data: { sold: { decrement: 1 } },
        });
      });

      throw new Error(`Payment failed for intent ${paymentIntentId}`);
    }

    this.logger.log(`Payment succeeded for registration ${registrationId}. Confirming booking.`);

    // Update status to CONFIRMED
    const registration = await this.adminPrisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CONFIRMED },
      include: {
        user: { select: { email: true } },
        ticketType: {
          select: {
            name: true,
            price: true,
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    // Enqueue ticket confirmation email
    await this.emailQueue.add(
      EmailJobType.TICKET_CONFIRMATION,
      {
        email: registration.user.email,
        eventName: registration.ticketType.event.title,
        ticketName: registration.ticketType.name,
        price: registration.ticketType.price.toString(),
        registrationId: registration.id,
        qrCodeValue: `ticket://booking/${registration.id}`,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Payment job failed: ${job.id} for registration ${job.data.registrationId}`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`Payment job completed: ${job.id} for registration ${job.data.registrationId}`);
  }
}
