import { IsString, Length } from 'class-validator';

export class ConnectCodeDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
