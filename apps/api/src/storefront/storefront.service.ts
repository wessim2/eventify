import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketService } from '../ticket/ticket.service';
import { EventStatus, RegistrationStatus } from '@eventify/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketService: TicketService,
  ) {}

  /**
   * Lists all published events for the active organization.
   * RLS policies apply automatically.
   */
  async findPublishedEvents() {
    return this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Fetches a single published event by its slug for the active organization.
   * RLS policies apply automatically.
   */
  async findPublishedEventBySlug(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: { slug, status: EventStatus.PUBLISHED },
      include: { ticketTypes: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found or not published');
    }

    return event;
  }

  /**
   * Registers an attendee for a ticket type under a transaction.
   * Enforces pessimistic locking to avoid overselling capacity.
   */
  async register(
    tenantId: string,
    userId: string,
    eventId: string,
    ticketTypeId: string,
    quantity: number,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      // Re-apply the tenant context inside the transaction block for strict RLS safety
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`,
      );

      // 1. Verify Event is active/published
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event || event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException('Event is not active or published');
      }

      // 2. Allocate inventory using pessimistic lock
      await this.ticketService.allocate(tx, ticketTypeId, quantity);

      // 3. Create pending registration
      const paymentIntentId = `pi_${crypto.randomBytes(16).toString('hex')}`;
      const registration = await tx.registration.create({
        data: {
          ticketTypeId,
          userId,
          status: RegistrationStatus.PENDING,
          paymentIntentId,
        },
      });

      return {
        registrationId: registration.id,
        paymentIntentId,
        status: registration.status,
      };
    });
  }

  /**
   * Fetches the details and status of a registration.
   * Asserts that the requesting user owns the registration record.
   */
  async getRegistration(registrationId: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
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

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.userId !== userId) {
      throw new ForbiddenException('You do not own this registration');
    }

    return registration;
  }

  /**
   * Generates a Stripe PaymentIntent for a pending registration.
   * Calculates platform application fees based on organization subscription tier (5% Free, 0% Pro).
   */
  async createPaymentIntent(registrationId: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        ticketType: {
          include: {
            event: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.userId !== userId) throw new ForbiddenException('You do not own this registration');

    const price = Number(registration.ticketType.price);
    const org = registration.ticketType.event.organization;

    // Free tickets automatically confirm
    if (price === 0) {
      const updated = await this.prisma.registration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.CONFIRMED },
      });
      return { clientSecret: null, paymentIntentId: registration.paymentIntentId, free: true, status: updated.status };
    }

    const totalAmountCents = Math.round(price * 100);
    const isProTier = org.subscriptionTier === 'PRO';
    const feeAmountCents = isProTier ? 0 : Math.round(totalAmountCents * 0.05);

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (stripeSecret && stripeSecret.startsWith('sk_')) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeSecret);

        const paymentIntentParams: any = {
          amount: totalAmountCents,
          currency: 'usd',
          payment_method_types: ['card'],
          metadata: {
            registrationId: registration.id,
            organizationId: org.id,
          },
        };

        if (org.stripeAccountId) {
          paymentIntentParams.application_fee_amount = feeAmountCents;
          paymentIntentParams.transfer_data = {
            destination: org.stripeAccountId,
          };
        }

        const intent = await stripe.paymentIntents.create(paymentIntentParams);
        await this.prisma.registration.update({
          where: { id: registrationId },
          data: { paymentIntentId: intent.id },
        });

        return {
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
          free: false,
        };
      } catch (err: any) {
        console.error('Stripe PaymentIntent error:', err);
      }
    }

    // Mock fallback client secret for local testing
    return {
      clientSecret: `${registration.paymentIntentId}_secret_mock`,
      paymentIntentId: registration.paymentIntentId,
      free: false,
    };
  }
}
