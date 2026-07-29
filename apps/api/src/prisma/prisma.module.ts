import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AdminPrismaService } from './admin-prisma.service';

/**
 * Global Prisma module — exported to all modules without re-importing.
 */
@Global()
@Module({
  providers: [PrismaService, AdminPrismaService],
  exports: [PrismaService, AdminPrismaService],
})
export class PrismaModule {}
