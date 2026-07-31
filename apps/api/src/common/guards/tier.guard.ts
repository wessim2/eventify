import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionTier } from '@eventify/shared-types';
import { TIER_KEY } from '../decorators/require-tier.decorator';
import { AdminPrismaService } from '../../prisma/admin-prisma.service';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminPrisma: AdminPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<SubscriptionTier>(
      TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required for TierGuard');
    }

    const org = await this.adminPrisma.organization.findUnique({
      where: { id: tenantId },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    if (requiredTier === SubscriptionTier.PRO && org.subscriptionTier !== SubscriptionTier.PRO) {
      throw new ForbiddenException(
        'This feature requires an active Pro Tier subscription ($29/month). Please upgrade your workspace in Organization Billing settings.',
      );
    }

    return true;
  }
}
