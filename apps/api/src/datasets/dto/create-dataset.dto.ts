import { IsOptional, IsString, MinLength, IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class CreateDatasetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  labels!: string[];

  @IsOptional()
  @IsUUID()
  modelId?: string;
}
