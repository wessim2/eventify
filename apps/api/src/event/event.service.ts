import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '@eventify/shared-types';

/**
 * Valid state machine transitions for Event status.
 * Key: current status → Value: allowed next statuses
 */
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.PUBLISHED]: [EventStatus.COMPLETED, EventStatus.CANCELLED],
  [EventStatus.COMPLETED]: [],
  [EventStatus.CANCELLED]: [],
};

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly prisma: PrismaService) { }

  async create(
    organizationId: string,
    dto: CreateEventDto,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (org?.subscriptionTier === 'FREE') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const eventsThisMonth = await this.prisma.event.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
      });
      if (eventsThisMonth >= 3) {
        throw new UnprocessableEntityException(
          'Free tier limit reached: Maximum 3 events per month. Upgrade to Pro ($29/mo) for unlimited event creation.',
        );
      }
    }

    const slug = await this.generateSlug(organizationId, dto.title);

    return this.prisma.event.create({
      data: {
        organizationId,
        title: dto.title,
        slug,
        description: dto.description,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: EventStatus.DRAFT
      },
    });
  }

  async findAll(
    organizationId: string,
    statusFilter?: EventStatus,
  ) {
    return this.prisma.event.findMany({
      where: {
        organizationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(statusFilter ? { status: statusFilter as any } : {}),
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async update(id: string, organizationId: string, dto: UpdateEventDto) {
    await this.findOne(id, organizationId);
    const data: Record<string, unknown> = {};
    if (dto.title) {
      data.title = dto.title;
      data.slug = await this.generateSlug(organizationId, dto.title, id);
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.event.update({ where: { id }, data });
  }

  async softDelete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.event.delete({ where: { id } });
  }

  /**
   * Transitions an event's status following the state machine rules.
   * Rejects invalid transitions with 422 Unprocessable Entity.
   * Used by both the API controller and the event lifecycle worker.
   */
  async transitionStatus(
    id: string,
    organizationId: string,
    newStatus: EventStatus,
  ) {
    const event = await this.findOne(id, organizationId);
    const currentStatus = event.status as unknown as EventStatus;

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition event from ${currentStatus} to ${newStatus}. ` +
        `Allowed transitions from ${currentStatus}: [${allowed.join(', ') || 'none'}]`,
      );
    }

    if (newStatus === EventStatus.PUBLISHED) {
      const tickets = await this.prisma.ticketType.findMany({ where: { eventId: id } });
      const hasPaidTickets = tickets.some((t: any) => Number(t.price) > 0);
      if (hasPaidTickets) {
        const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
        if (!org?.stripeAccountId) {
          throw new UnprocessableEntityException(
            'Cannot publish an event with paid tickets until your organization connects a Stripe account.',
          );
        }
      }
    }

    return this.prisma.event.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { status: newStatus as any },
    });
  }

  /**
   * Finds all published events whose end date has passed.
   * Used by the event lifecycle worker (bypasses tenant context — system-level).
   */
  async findPastDuePublishedEvents() {
    return this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED' as any,
        endDate: { lt: new Date() },
      },
    });
  }

  /**
   * Transitions a specific event to COMPLETED without tenant validation.
   * Only called by the event lifecycle worker (system-level, cross-tenant).
   */
  async markCompleted(id: string): Promise<void> {
    await this.prisma.event.update({
      where: { id },
      data: { status: 'COMPLETED' as any },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async generateSlug(
    organizationId: string,
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    let slug = base;
    let attempt = 0;

    while (true) {
      const existing = await this.prisma.event.findFirst({
        where: { organizationId, slug },
      });
      if (!existing || existing.id === excludeId) break;
      attempt++;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }

  /**
   * Lists all registrations (attendees) for a specific event.
   * Asserves tenant ownership of the parent event.
   */
  async findRegistrations(eventId: string, organizationId: string) {
    await this.findOne(eventId, organizationId);

    return this.prisma.registration.findMany({
      where: {
        ticketType: {
          eventId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a ticket type for a specific event.
   * Asserts tenant ownership.
   */
  async createTicketType(eventId: string, organizationId: string, dto: any) {
    await this.findOne(eventId, organizationId);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (org?.subscriptionTier === 'FREE') {
      const existingTypesCount = await this.prisma.ticketType.count({ where: { eventId } });
      if (existingTypesCount >= 2) {
        throw new UnprocessableEntityException(
          'Free tier limit reached: Maximum 2 ticket types per event. Upgrade to Pro ($29/mo) for unlimited ticket tiers.',
        );
      }
    }
    return this.prisma.ticketType.create({
      data: {
        eventId,
        name: dto.name,
        price: dto.price,
        capacity: dto.capacity,
      },
    });
  }

  /**
   * Lists all ticket types for a specific event.
   * Asserts tenant ownership.
   */
  async findTicketTypes(eventId: string, organizationId: string) {
    await this.findOne(eventId, organizationId);
    return this.prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Performs check-in for an attendee registration.
   * Asserts tenant ownership and prevents duplicate check-ins.
   */
  async checkInAttendee(eventId: string, organizationId: string, registrationId: string) {
    await this.findOne(eventId, organizationId);

    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        ticketType: { select: { name: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration record not found.');
    }

    if (registration.status !== 'CONFIRMED') {
      throw new UnprocessableEntityException(`Cannot check in: Booking status is ${registration.status}.`);
    }

    if (registration.checkedInAt) {
      const timeStr = new Date(registration.checkedInAt).toLocaleTimeString();
      throw new UnprocessableEntityException(
        `Attendee ALREADY checked in at ${timeStr}. Duplicate scan rejected.`,
      );
    }

    const updated = await this.prisma.registration.update({
      where: { id: registrationId },
      data: { checkedInAt: new Date() },
    });

    return {
      success: true,
      checkedInAt: updated.checkedInAt,
      registration: {
        id: registration.id,
        user: registration.user,
        ticketType: registration.ticketType,
      },
    };
  }

  /**
   * Retrieves real-time check-in stats for an event.
   */
  async getCheckInStats(eventId: string, organizationId: string) {
    await this.findOne(eventId, organizationId);

    const [totalRegistrations, checkedInCount] = await Promise.all([
      this.prisma.registration.count({
        where: { ticketType: { eventId }, status: 'CONFIRMED' },
      }),
      this.prisma.registration.count({
        where: { ticketType: { eventId }, status: 'CONFIRMED', checkedInAt: { not: null } },
      }),
    ]);

    const percent = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;

    return {
      totalRegistrations,
      checkedInCount,
      percentCheckedIn: percent,
    };
  }
}
