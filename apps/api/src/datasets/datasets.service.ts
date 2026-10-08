import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  constructor(private readonly prisma: PrismaService) {}

  create(projectId: string, dto: CreateDatasetDto) {
    return this.prisma.dataset.create({
      data: {
        projectId,
        name: dto.name,
        instructions: dto.instructions,
        labels: dto.labels,
        modelId: dto.modelId,
      },
    });
  }

  findByProject(projectId: string) {
    return this.prisma.dataset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.dataset.findUniqueOrThrow({
      where: { id },
      include: { images: true, model: true },
    });
  }
}
