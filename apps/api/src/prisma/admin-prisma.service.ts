import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Env } from '../config/env.schema';

/**
  * AdminPrismaService — provides database access using the superuser credentials
  * (eventify_admin) which bypasses PostgreSQL Row-Level Security (RLS) policies.
  * Used for background tasks (e.g. event lifecycle worker) and storefront slug resolution.
  */
@Injectable()
export class AdminPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AdminPrismaService.name);
  private readonly prisma: any;

  constructor(private readonly configService: ConfigService<Env, true>) {
    super({
      datasourceUrl: configService.get('DATABASE_URL', { infer: true }),
      log:
        configService.get('NODE_ENV', { infer: true }) === 'development'
          ? ['info', 'warn', 'error']
          : ['warn', 'error'],
    });

    const softDeletableModels = ['User', 'Organization', 'Event', 'TicketType'];

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

    return new Proxy(this, {
      get: (target, prop) => {
        if (
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
    this.logger.log('Database connection established (admin-level user, bypasses RLS)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
