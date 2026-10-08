import { IsOptional, IsString, MinLength, IsNumber, Min, Max, IsArray, IsObject } from 'class-validator';

export class UpdateAnnotationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  // Bounding box as { x, y, width, height }. Plain-object shape: the value
  // round-trips through Prisma Json (JsonValue), so we validate "is a shape".
  @IsOptional()
  @IsObject()
  bbox?: Record<string, number>;

  // Polygon as [{ x, y }, ...].
  @IsOptional()
  @IsArray()
  polygon?: Array<Record<string, number>>;
}
