import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;
}

export class RegisterImageDto {
  @IsString()
  storageKey!: string;

  @IsString()
  originalName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(0)
  sizeBytes!: number;

  @IsString()
  sha256!: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;
}
