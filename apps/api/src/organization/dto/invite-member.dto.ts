import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@eventify/shared-types';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
