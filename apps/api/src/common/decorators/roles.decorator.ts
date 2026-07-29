import { SetMetadata } from '@nestjs/common';
import { Role } from '@eventify/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Route decorator that specifies which roles are allowed to access the route.
 * Works in conjunction with RolesGuard.
 *
 * Usage:
 *   @Roles(Role.OWNER, Role.ADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   async deleteOrganization() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
