import { IsEnum } from 'class-validator';
import { Role } from '@eventify/shared-types';

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  role: Role;
}
