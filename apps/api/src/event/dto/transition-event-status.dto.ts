import { IsEnum } from 'class-validator';
import { EventStatus } from '@eventify/shared-types';

export class TransitionEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
