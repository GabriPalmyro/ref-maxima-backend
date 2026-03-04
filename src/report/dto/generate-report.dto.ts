import { IsEnum, IsObject } from 'class-validator';
import { ReportType } from '@prisma/client';

export class GenerateReportDto {
  @IsEnum(ReportType)
  type!: ReportType;

  @IsObject()
  answers!: Record<string, string>;
}
