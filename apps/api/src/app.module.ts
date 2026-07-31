import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { EventModule } from './event/event.module';
import { TenantModule } from './tenant/tenant.module';
import { TicketModule } from './ticket/ticket.module';
import { StorefrontModule } from './storefront/storefront.module';
import { EmailWorkerModule } from './workers/email/email-worker.module';
import { EventLifecycleWorkerModule } from './workers/event-lifecycle/event-lifecycle-worker.module';
import { PaymentWorkerModule } from './workers/payment/payment-worker.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HealthController } from './app.controller';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    AuthModule,
    OrganizationModule,
    EventModule,
    TenantModule,
    TicketModule,
    StorefrontModule,
    EmailWorkerModule,
    EventLifecycleWorkerModule,
    PaymentWorkerModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
