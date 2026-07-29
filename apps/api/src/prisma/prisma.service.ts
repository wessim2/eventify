import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Env } from '../config/env.schema';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly prisma: any;

  constructor(private readonly configService: ConfigService<Env, true>) {
    super({
      datasourceUrl: configService.get('DATABASE_APP_URL', { infer: true }),
      log:
        configService.get('NODE_ENV', { infer: true }) === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });

    const softDeletableModels = ['User', 'Organization', 'Event'];

    // Define client extension for soft delete
    this.prisma = this.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async findFirst({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async findUnique({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async count({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async delete({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              return query({
                ...args,
                operation: 'update',
                action: 'update',
                data: { deletedAt: new Date() },
              });
            }
            return query(args);
          },
          async deleteMany({ model, args, query }: any) {
            if (softDeletableModels.includes(model)) {
              return query({
                ...args,
                operation: 'updateMany',
                action: 'updateMany',
                data: { deletedAt: new Date() },
              });
            }
            return query(args);
          },
        },
      },
    });

    // Return a Proxy that forwards all properties to the extended client,
    // except for explicit PrismaService methods.
    return new Proxy(this, {
      get: (target, prop) => {
        if (
          prop === 'setTenantContext' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'logger' ||
          prop === 'prisma'
        ) {
          return (target as any)[prop];
        }
        return target.prisma[prop];
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established (app-level user, RLS active)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Sets the PostgreSQL session variable used by Row-Level Security policies.
   * MUST be called within a transaction (SET LOCAL is transaction-scoped).
   * This is called by TenantMiddleware on every tenant-scoped request.
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRawUnsafe(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`,
    );
  }
}

