import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateInstagramHandleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200) // Allow URLs up to 200 chars, will be normalized
  handle!: string;
}
