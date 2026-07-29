import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@eventify/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../types/request.types';

/**
 * Guard that checks whether the authenticated user's organization-level role
 * satisfies the required roles set by the @Roles() decorator.
 *
 * Prerequisites (must run after these):
 *   1. JwtAuthGuard — sets request.user
 *   2. TenantMiddleware — sets request.memberRole
 *
 * If no @Roles() metadata is present on the route, the guard allows access
 * (any authenticated org member can proceed).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated member is allowed
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { memberRole } = request;

    if (!memberRole) {
      throw new ForbiddenException(
        'Tenant context required. Provide X-Organization-Id header.',
      );
    }

    if (!requiredRoles.includes(memberRole)) {
      throw new ForbiddenException(
        `Insufficient role. Required: [${requiredRoles.join(', ')}]. Your role: ${memberRole}`,
      );
    }

    return true;
  }
}
