import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateRoundDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  categoryIndex: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  questionIndex: number;
}
