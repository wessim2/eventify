import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { RegisterEventDto } from './dto/register-event.dto';
import { StorefrontTenantGuard } from '../tenant/storefront-tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/request.types';
import { ApiTags, ApiHeader, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Storefront')
@ApiHeader({
  name: 'X-Organization-Slug',
  required: true,
  description: 'Slug of the organization/tenant being accessed',
})
@Controller('storefront')
@UseGuards(StorefrontTenantGuard)
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('events')
  @ApiOperation({ summary: 'List all published events for active tenant' })
  findPublishedEvents() {
    return this.storefrontService.findPublishedEvents();
  }

  @Get('events/:slug')
  @ApiOperation({ summary: 'Get published event details by slug' })
  findPublishedEventBySlug(@Param('slug') slug: string) {
    return this.storefrontService.findPublishedEventBySlug(slug);
  }

  @Post('events/:eventId/register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register for an event ticket tier' })
  register(
    @Request() req: any,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterEventDto,
  ) {
    return this.storefrontService.register(
      req.tenantId,
      user.userId,
      eventId,
      dto.ticketTypeId,
      dto.quantity,
    );
  }

  @Get('registrations/:registrationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration details and status' })
  getRegistration(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.storefrontService.getRegistration(registrationId, user.userId);
  }
}
