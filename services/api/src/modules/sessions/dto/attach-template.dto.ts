import { IsNotEmpty, IsString } from 'class-validator';

export class AttachTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;
}
