import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class MentorRegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
