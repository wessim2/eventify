import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '@eventify/shared-types';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Storefront Webhooks')
@Controller('storefront/payments')
export class PaymentWebhookController {
  constructor(
    @InjectQueue(QueueName.PAYMENT) private readonly paymentQueue: Queue,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate a payment webhook callback' })
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    await this.paymentQueue.add(
      'process-payment',
      {
        registrationId: dto.registrationId,
        paymentIntentId: dto.paymentIntentId,
        shouldFail: dto.shouldFail,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return { queued: true };
  }
}
