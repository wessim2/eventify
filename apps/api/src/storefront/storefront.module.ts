import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { PublicStorefrontController } from './public-storefront.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { StorefrontService } from './storefront.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';
import { TicketModule } from '../ticket/ticket.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TenantModule, AuthModule, TicketModule, QueueModule],
  controllers: [
    StorefrontController,
    PublicStorefrontController,
    PaymentWebhookController,
  ],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
