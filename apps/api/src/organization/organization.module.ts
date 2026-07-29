import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { QueueName } from '@eventify/shared-types';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EMAIL })],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
