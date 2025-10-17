import { IsString, IsOptional, IsBoolean, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BioscopeImageDto {
  @IsString()
  id: string;

  @IsString()
  file: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsOptional()
  reveal_delay_seconds?: number;

  @IsOptional()
  points_multiplier?: number;
}

export class BioscopeAnswerDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsArray()
  alternatives?: string[];

  @IsOptional()
  @IsString()
  reveal_sound?: string;

  @IsOptional()
  @IsString()
  reveal_effect?: string;
}

export class BioscopeScoringDto {
  @IsOptional()
  base_points?: number;

  @IsOptional()
  early_bonus?: number;

  @IsOptional()
  final_image_points?: number;
}

export class BioscopeRoundDto {
  @IsString()
  round_id: string;

  @IsString()
  title: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BioscopeImageDto)
  images: BioscopeImageDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => BioscopeAnswerDto)
  answer: BioscopeAnswerDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BioscopeScoringDto)
  scoring?: BioscopeScoringDto;
}

export class BioscopeConfigurationDto {
  @IsOptional()
  timer_seconds?: number;

  @IsOptional()
  @IsBoolean()
  timer_sound_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  multiple_choice_mode?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_manual_scoring?: boolean;

  @IsOptional()
  max_images?: number;

  @IsOptional()
  @IsObject()
  sound_effects?: {
    on_image_reveal?: string;
    on_final_reveal?: string;
    on_correct_answer?: string;
  };

  @IsOptional()
  @IsString()
  reveal_animation?: string;

  @IsOptional()
  @IsString()
  title_reveal_animation?: string;
}

export class CreateBioscopeTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BioscopeConfigurationDto)
  configuration: BioscopeConfigurationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BioscopeRoundDto)
  rounds: BioscopeRoundDto[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateBioscopeTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BioscopeConfigurationDto)
  configuration?: BioscopeConfigurationDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BioscopeRoundDto)
  rounds?: BioscopeRoundDto[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
