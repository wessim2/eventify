import { IsString, IsNumber, IsInt, Min } from 'class-validator';

export class CreateTicketTypeDto {
  @IsString()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  capacity: number;
}
