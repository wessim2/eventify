import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminPrismaService } from '../prisma/admin-prisma.service';
import { EventStatus } from '@eventify/shared-types';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';

@ApiTags('Public Storefront')
@Controller('public')
export class PublicStorefrontController {
  constructor(private readonly adminPrisma: AdminPrismaService) {}

  @Get('events')
  @ApiOperation({ summary: 'List all published events across all organizations' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findGlobalEvents(@Query('search') search?: string) {
    const whereCondition: any = {
      status: EventStatus.PUBLISHED,
    };

    if (search && search.trim()) {
      const query = search.trim();
      whereCondition.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { organization: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const events = await this.adminPrisma.event.findMany({
      where: whereCondition,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            sold: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return events;
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List all active organizations' })
  async findGlobalOrganizations() {
    return this.adminPrisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            events: {
              where: { status: EventStatus.PUBLISHED },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('my-registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all registrations and tickets for authenticated attendee' })
  async findMyRegistrations(@CurrentUser() user: AuthenticatedUser) {
    const registrations = await this.adminPrisma.registration.findMany({
      where: { userId: user.userId },
      include: {
        ticketType: {
          include: {
            event: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations;
  }
}
