import { IsUUID, IsInt, Min } from 'class-validator';

export class RegisterEventDto {
  @IsUUID()
  ticketTypeId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
