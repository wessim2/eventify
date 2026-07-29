import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../tenant/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser, RequestWithUser } from '../common/types/request.types';
import { Role } from '@eventify/shared-types';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiHeader({
  name: 'X-Organization-Id',
  required: false,
  description: 'The active organization ID (tenant context)',
})
@Controller('organizations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(user.userId, dto);
  }

  /** Lists all orgs the user belongs to — not tenant-scoped */
  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationService.listForUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.softDelete(id);
  }

  // ---------------------------------------------------------------------------
  // Member management
  // ---------------------------------------------------------------------------

  @Get(':id/members')
  listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.listMembers(id);
  }

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationService.inviteMember(id, user.userId, dto);
  }

  @Post(':id/invitations/:invitationId/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationService.acceptInvitation(invitationId, user.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: RequestWithUser,
  ) {
    return this.organizationService.removeMember(
      id,
      targetUserId,
      user.userId,
      req.memberRole!,
    );
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationService.updateMemberRole(id, targetUserId, dto);
  }
}
