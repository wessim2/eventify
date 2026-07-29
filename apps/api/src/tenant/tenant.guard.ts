import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestWithUser } from '../common/types/request.types';

/**
 * TenantGuard — resolves and validates the active tenant context.
 *
 * Runs after JwtAuthGuard has populated request.user.
 *
 * Flow:
 *   1. Read X-Organization-Id from request headers
 *   2. If absent, allow request to proceed (tenant context is optional or checked later)
 *   3. If present, validate the authenticated user has an active membership in that org
 *   4. Set the Postgres session variable for RLS: SET app.current_tenant_id
 *   5. Attach tenantId and memberRole to the request for downstream guards/controllers
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const organizationId = request.headers['x-organization-id'] as
      | string
      | undefined;

    if (!organizationId) {
      return true;
    }

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(organizationId)) {
      throw new ForbiddenException('Invalid X-Organization-Id format');
    }

    // Set the Postgres session variable for RLS so we can query the organization relation
    await this.prisma.$executeRawUnsafe(
      `SET app.current_tenant_id = '${organizationId}'`,
    );

    // Validate membership
    let membership;
    try {
      membership = await this.prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: request.user.userId,
            organizationId,
          },
        },
        include: {
          organization: { select: { id: true, deletedAt: true } },
        },
      });
    } catch (error) {
      // Reset context on database query failure
      await this.prisma.$executeRawUnsafe("SET app.current_tenant_id = ''");
      throw error;
    }

    if (!membership || membership.organization.deletedAt) {
      // Reset context if membership invalid
      await this.prisma.$executeRawUnsafe("SET app.current_tenant_id = ''");
      throw new ForbiddenException(
        'You are not a member of this organization or it does not exist',
      );
    }

    // Attach tenant context to the request
    request.tenantId = organizationId;
    request.memberRole = membership.role as any;

    return true;
  }
}
