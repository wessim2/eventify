import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPrismaService } from '../prisma/admin-prisma.service';

/**
 * StorefrontTenantGuard — resolves the tenant context for anonymous public storefront requests.
 *
 * Reads X-Organization-Slug from request headers, looks up the organization ID
 * using AdminPrismaService (which bypasses RLS), and sets the PostgreSQL
 * session variable for the standard runtime PrismaService connection.
 */
@Injectable()
export class StorefrontTenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminPrisma: AdminPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.headers['x-organization-slug'] as string | undefined;

    if (!slug) {
      throw new BadRequestException('X-Organization-Slug header is required');
    }

    // Look up organization by slug using the admin database connection
    const org = await this.adminPrisma.organization.findUnique({
      where: { slug },
    });

    if (!org) {
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    }

    // Set the Postgres session variable for RLS
    await this.prisma.$executeRawUnsafe(
      `SET app.current_tenant_id = '${org.id}'`,
    );

    // Attach the resolved tenantId to request
    request.tenantId = org.id;

    return true;
  }
}
