import { IsString, MinLength } from 'class-validator';

export class CorrectReportDto {
  @IsString()
  @MinLength(5)
  correction!: string;
}
