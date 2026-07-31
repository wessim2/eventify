import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { TransitionEventStatusDto } from './dto/transition-event-status.dto';
import { CreateTicketTypeDto } from '../ticket/dto/create-ticket-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/types/request.types';
import { Role, EventStatus } from '@eventify/shared-types';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiHeader({
  name: 'X-Organization-Id',
  required: true,
  description: 'The active organization ID (tenant context)',
})
@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  create(@Request() req: RequestWithUser, @Body() dto: CreateEventDto) {
    this.requireTenantContext(req);
    return this.eventService.create(req.tenantId!, dto);
  }

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('status') status?: EventStatus,
  ) {
    this.requireTenantContext(req);
    return this.eventService.findAll(req.tenantId!, status);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.findOne(id, req.tenantId!);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateEventDto,
  ) {
    this.requireTenantContext(req);
    return this.eventService.update(id, req.tenantId!, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.softDelete(id, req.tenantId!);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  transitionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
    @Body() dto: TransitionEventStatusDto,
  ) {
    this.requireTenantContext(req);
    return this.eventService.transitionStatus(id, req.tenantId!, dto.status);
  }

  @Get(':id/registrations')
  findRegistrations(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.findRegistrations(id, req.tenantId!);
  }

  @Post(':id/ticket-types')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  createTicketType(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateTicketTypeDto,
  ) {
    this.requireTenantContext(req);
    return this.eventService.createTicketType(id, req.tenantId!, dto);
  }

  @Get(':id/ticket-types')
  findTicketTypes(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.findTicketTypes(id, req.tenantId!);
  }

  @Post(':id/check-in/:registrationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  checkInAttendee(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.checkInAttendee(id, req.tenantId!, registrationId);
  }

  @Get(':id/check-in/stats')
  getCheckInStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    this.requireTenantContext(req);
    return this.eventService.getCheckInStats(id, req.tenantId!);
  }

  private requireTenantContext(req: RequestWithUser): void {
    if (!req.tenantId) {
      throw new ForbiddenException(
        'Tenant context required. Provide X-Organization-Id header.',
      );
    }
  }
}
