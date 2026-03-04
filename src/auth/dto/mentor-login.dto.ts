import { IsEmail, IsString } from 'class-validator';

export class MentorLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
