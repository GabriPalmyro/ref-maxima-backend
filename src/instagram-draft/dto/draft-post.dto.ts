import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class DraftPostDto {
  @IsInt()
  @Min(0)
  @Max(11)
  position!: number;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  originalPostId?: string;
}
