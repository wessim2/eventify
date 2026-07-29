import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class PaymentWebhookDto {
  @IsUUID()
  registrationId: string;

  @IsString()
  paymentIntentId: string;

  @IsBoolean()
  @IsOptional()
  shouldFail?: boolean;
}
