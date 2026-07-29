import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueName, EmailJobType } from '@eventify/shared-types';

// ---------------------------------------------------------------------------
// Job payload types
// ---------------------------------------------------------------------------

interface VerificationEmailPayload {
  userId: string;
  email: string;
  verificationToken: string;
}

interface PasswordResetPayload {
  userId: string;
  email: string;
  resetToken: string;
}

interface OrgInvitationPayload {
  inviterName: string;
  organizationName: string;
  inviteeEmail: string;
  invitationId: string;
}

interface TicketConfirmationPayload {
  email: string;
  eventName: string;
  ticketName: string;
  price: string;
  registrationId: string;
  qrCodeValue: string;
}

type EmailJobPayload =
  | VerificationEmailPayload
  | PasswordResetPayload
  | OrgInvitationPayload
  | TicketConfirmationPayload;

/**
 * EmailProcessor — consumes jobs from the 'email' BullMQ queue.
 *
 * Phase 1 transport: console logger. The job infrastructure, payload types,
 * and retry configuration are all production-ready. Swap the console logger
 * for an SMTP/SendGrid transport in Phase N without changing the queue contract.
 */
@Processor(QueueName.EMAIL, {
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobPayload>): Promise<void> {
    this.logger.log(`Processing email job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case EmailJobType.VERIFICATION_EMAIL:
        await this.handleVerificationEmail(
          job.data as VerificationEmailPayload,
        );
        break;

      case EmailJobType.PASSWORD_RESET:
        await this.handlePasswordReset(job.data as PasswordResetPayload);
        break;

      case EmailJobType.ORG_INVITATION:
        await this.handleOrgInvitation(job.data as OrgInvitationPayload);
        break;

      case EmailJobType.TICKET_CONFIRMATION:
        await this.handleTicketConfirmation(job.data as TicketConfirmationPayload);
        break;

      default:
        this.logger.warn(`Unknown email job type: ${job.name}`);
    }
  }

  private async handleVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    // Phase 1: console transport — replace with SMTP/SendGrid in Phase N
    this.logger.log(
      [
        `[EMAIL] VERIFICATION`,
        `  To: ${payload.email}`,
        `  Subject: Verify your Eventify account`,
        `  Body: Click the link to verify: https://app.eventify.io/verify?token=${payload.verificationToken}`,
      ].join('\n'),
    );
  }

  private async handlePasswordReset(
    payload: PasswordResetPayload,
  ): Promise<void> {
    this.logger.log(
      [
        `[EMAIL] PASSWORD_RESET`,
        `  To: ${payload.email}`,
        `  Subject: Reset your Eventify password`,
        `  Body: Click to reset: https://app.eventify.io/reset-password?token=${payload.resetToken}`,
      ].join('\n'),
    );
  }

  private async handleOrgInvitation(
    payload: OrgInvitationPayload,
  ): Promise<void> {
    this.logger.log(
      [
        `[EMAIL] ORG_INVITATION`,
        `  To: ${payload.inviteeEmail}`,
        `  Subject: You've been invited to join ${payload.organizationName} on Eventify`,
        `  Body: ${payload.inviterName} invited you. Accept at: https://app.eventify.io/invitations/${payload.invitationId}/accept`,
      ].join('\n'),
    );
  }

  private async handleTicketConfirmation(
    payload: TicketConfirmationPayload,
  ): Promise<void> {
    this.logger.log(
      [
        `[EMAIL] TICKET_CONFIRMATION`,
        `  To: ${payload.email}`,
        `  Subject: Your ticket for ${payload.eventName}`,
        `  Body: Congratulations! You're registered.`,
        `    Event: ${payload.eventName}`,
        `    Ticket Type: ${payload.ticketName}`,
        `    Price: $${payload.price}`,
        `    Booking ID: ${payload.registrationId}`,
        `    QR Check-in Code: ${payload.qrCodeValue}`,
      ].join('\n'),
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Email job failed: ${job.name} (id: ${job.id}, attempt: ${job.attemptsMade})`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.debug(`Email job completed: ${job.name} (id: ${job.id})`);
  }
}
