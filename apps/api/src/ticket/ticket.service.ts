import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new ticket type for an event.
   * RLS policies will ensure the event belongs to the active tenant.
   */
  async createTicketType(eventId: string, dto: CreateTicketTypeDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
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
   * Lists all ticket types for an event.
   * RLS policies apply automatically.
   */
  async findForEvent(eventId: string) {
    return this.prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Allocates ticket inventory for a given TicketType within a transaction.
   * Uses raw SQL SELECT ... FOR UPDATE to lock the row and prevent concurrent double-booking.
   */
  async allocate(tx: any, ticketTypeId: string, quantity: number) {
    // 1. Fetch and Lock the row: SELECT ... FOR UPDATE
    const rows = (await tx.$queryRawUnsafe(
      `SELECT id, capacity, sold FROM "ticket_types" WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
      ticketTypeId,
    )) as any[];

    if (!rows || rows.length === 0) {
      throw new NotFoundException('Ticket type not found');
    }

    const ticketType = rows[0];

    // 2. Check Capacity
    const newSold = ticketType.sold + quantity;
    if (newSold > ticketType.capacity) {
      throw new ConflictException(
        `Ticket capacity exceeded. Available: ${ticketType.capacity - ticketType.sold}, Requested: ${quantity}`,
      );
    }

    // 3. Update Sold Count
    const updated = await tx.ticketType.update({
      where: { id: ticketTypeId },
      data: { sold: newSold },
    });

    return updated;
  }
}
