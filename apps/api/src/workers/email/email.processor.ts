import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueName, EmailJobType } from '@eventify/shared-types';
import { Resend } from 'resend';

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

@Processor(QueueName.EMAIL, {
  concurrency: 5,
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private resendClient: Resend | null = null;

  constructor() {
    super();
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.startsWith('re_')) {
      this.resendClient = new Resend(apiKey);
      this.logger.log('Resend Email Transport initialized successfully.');
    } else {
      this.logger.log('Using local console email transport fallback.');
    }
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    this.logger.log(`Processing email job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case EmailJobType.VERIFICATION_EMAIL:
        await this.handleVerificationEmail(job.data as VerificationEmailPayload);
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

  private async dispatchEmail(to: string, subject: string, html: string, textBody: string) {
    if (this.resendClient) {
      try {
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Eventify <tickets@eventify.io>';
        await this.resendClient.emails.send({
          from: fromAddress,
          to: [to],
          subject,
          html,
          text: textBody,
        });
        this.logger.log(`Live email dispatched via Resend to ${to} [Subject: "${subject}"]`);
        return;
      } catch (err: any) {
        this.logger.error(`Failed to send email via Resend: ${err.message}`);
      }
    }

    // Fallback console logging for local dev
    this.logger.log(
      [
        `[EMAIL TRANSPORT: CONSOLE]`,
        `  To: ${to}`,
        `  Subject: ${subject}`,
        `  Content:\n${textBody}`,
      ].join('\n')
    );
  }

  private async handleVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    const subject = 'Verify your Eventify account';
    const textBody = `Click the link to verify your account: http://localhost:3002/login?verify=${payload.verificationToken}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; background-color: #fcfbf7; color: #0f172a;">
        <h2 style="color: #0f766e;">Welcome to Eventify</h2>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <a href="http://localhost:3002/login?verify=${payload.verificationToken}" style="background-color: #0f766e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
      </div>
    `;
    await this.dispatchEmail(payload.email, subject, html, textBody);
  }

  private async handlePasswordReset(payload: PasswordResetPayload): Promise<void> {
    const subject = 'Reset your Eventify password';
    const textBody = `Click to reset your password: http://localhost:3002/reset-password?token=${payload.resetToken}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; background-color: #fcfbf7; color: #0f172a;">
        <h2 style="color: #0f766e;">Reset Your Password</h2>
        <p>We received a request to reset your Eventify password. Click the button below:</p>
        <a href="http://localhost:3002/reset-password?token=${payload.resetToken}" style="background-color: #0f766e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      </div>
    `;
    await this.dispatchEmail(payload.email, subject, html, textBody);
  }

  private async handleOrgInvitation(payload: OrgInvitationPayload): Promise<void> {
    const subject = `You've been invited to join ${payload.organizationName} on Eventify`;
    const textBody = `${payload.inviterName} invited you to join ${payload.organizationName}. Accept at: http://localhost:3001/select-org?invitationId=${payload.invitationId}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; background-color: #fcfbf7; color: #0f172a;">
        <h2 style="color: #0f766e;">Workspace Invitation</h2>
        <p><strong>${payload.inviterName}</strong> has invited you to join <strong>${payload.organizationName}</strong> as a team collaborator on Eventify.</p>
        <a href="http://localhost:3001/select-org?invitationId=${payload.invitationId}" style="background-color: #0f766e; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Workspace Invitation</a>
      </div>
    `;
    await this.dispatchEmail(payload.inviteeEmail, subject, html, textBody);
  }

  private async handleTicketConfirmation(payload: TicketConfirmationPayload): Promise<void> {
    const subject = `Ticket Confirmation: ${payload.eventName}`;
    const textBody = `Your ticket for ${payload.eventName} (${payload.ticketName}) is confirmed. Booking ID: ${payload.registrationId}`;
    const html = `
      <div style="font-family: sans-serif; padding: 24px; background-color: #fcfbf7; color: #0f172a; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f766e; margin-bottom: 4px; font-family: sans-serif;">🎟️ Event Admission Pass</h2>
          <p style="color: #475569; margin: 0; font-size: 14px;">Your seat booking has been successfully confirmed.</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #0f172a;">${payload.eventName}</h3>
          <p style="margin: 0 0 6px 0; color: #475569; font-size: 14px;">Ticket Tier: <strong>${payload.ticketName}</strong></p>
          <p style="margin: 0 0 6px 0; color: #475569; font-size: 14px;">Price Paid: <strong>$${payload.price}</strong></p>
          <p style="margin: 0; color: #64748b; font-size: 12px;">Booking Ref: <code>${payload.registrationId}</code></p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">Present this digital QR code pass at event check-in:</p>
          <a href="http://localhost:3002/my-tickets" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Digital QR Pass</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 12px; color: #94a3b8;">
          Eventify SaaS Platform • Digital Pass Engine
        </div>
      </div>
    `;
    await this.dispatchEmail(payload.email, subject, html, textBody);
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
