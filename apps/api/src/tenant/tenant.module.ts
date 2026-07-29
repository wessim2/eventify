import { Module } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { StorefrontTenantGuard } from './storefront-tenant.guard';

@Module({
  providers: [TenantGuard, StorefrontTenantGuard],
  exports: [TenantGuard, StorefrontTenantGuard],
})
export class TenantModule {}
