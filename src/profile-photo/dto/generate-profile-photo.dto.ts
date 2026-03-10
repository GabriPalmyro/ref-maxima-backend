import { IsIn, IsString } from 'class-validator';

export class GenerateProfilePhotoDto {
  @IsString()
  @IsIn(['male', 'female'])
  gender!: string;
}
