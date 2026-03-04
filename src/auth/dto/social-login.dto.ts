import { IsEnum, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsEnum(['GOOGLE', 'APPLE'])
  provider!: 'GOOGLE' | 'APPLE';

  @IsString()
  idToken!: string;
}
