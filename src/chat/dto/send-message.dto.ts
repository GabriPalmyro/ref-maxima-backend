import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsIn(['legendas', 'criativos', 'palestra', 'landing_page'])
  topic?: string;
}
