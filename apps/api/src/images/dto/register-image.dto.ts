import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Only these MIME types may be uploaded or registered. */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum accepted upload size: 50 MB. */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

export class PresignUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @IsIn(IMAGE_MIME_TYPES as unknown as string[])
  mimeType!: string;
}

export class RegisterImageDto {
  // Server-generated in presign: datasets/<datasetId>/<uuid>-<safe-name>.
  // Binding the dataset id into the pattern prevents cross-dataset keys.
  @IsString()
  @Matches(/^datasets\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,140}$/)
  storageKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  originalName!: string;

  @IsIn(IMAGE_MIME_TYPES as unknown as string[])
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  sizeBytes!: number;

  // Lowercase hex SHA-256, produced client-side by utils.sha256Hex.
  @IsString()
  @Matches(/^[0-9a-f]{64}$/)
  sha256!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;
}
