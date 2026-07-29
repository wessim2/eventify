import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
}
