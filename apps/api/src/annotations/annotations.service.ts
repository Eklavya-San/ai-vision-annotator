import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forImage(imageId: string) {
    // Guard so a bad image id yields a 404 rather than an empty list.
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      select: { id: true },
    });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);

    return this.prisma.annotation.findMany({
      where: { imageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateAnnotationDto) {
    const existing = await this.prisma.annotation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Annotation ${id} not found`);

    const data: Prisma.AnnotationUpdateInput = {
      // A human edit is by definition a correction.
      isCorrected: true,
    };

    if (dto.label !== undefined) data.label = dto.label;
    if (dto.confidence !== undefined) data.confidence = dto.confidence;
    // An explicit null is treated as absent — geometry is never cleared partially.
    if (dto.bbox !== undefined && dto.bbox !== null) data.bbox = { ...dto.bbox };
    if (dto.polygon !== undefined && dto.polygon !== null) data.polygon = dto.polygon.map((p) => ({ ...p }));

    return this.prisma.annotation.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.annotation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Annotation ${id} not found`);

    return this.prisma.annotation.delete({ where: { id } });
  }
}
