import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  menteeName?: string;

  @IsOptional()
  @IsEmail()
  menteeEmail?: string;

  @IsOptional()
  @IsUUID()
  menteeId?: string;
}
