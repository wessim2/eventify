import { Request } from 'express';
import { Role } from '@eventify/shared-types';

/**
 * Authenticated user payload attached by JwtStrategy after JWT validation.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Extended request type with authenticated user (set by JwtAuthGuard)
 * and optional tenant context (set by TenantMiddleware).
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  tenantId?: string;
  memberRole?: Role;
}
