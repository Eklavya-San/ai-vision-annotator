import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnnotationProducer } from '../queue/annotation.producer';
import { AnnotationJobData } from '../queue/constants';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: AnnotationProducer,
  ) {}

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

  async triggerAnnotation(datasetId: string): Promise<{ queued: number }> {
    const dataset = await this.prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      include: { images: true },
    });

    const instructions = dataset.instructions ?? '';
    const labels = (dataset.labels as string[] | undefined) ?? [];

    const jobs: AnnotationJobData[] = dataset.images.map((image) => ({
      datasetId,
      imageId: image.id,
      storageKey: image.storageKey,
      instructions,
      labels,
    }));

    await this.producer.queueDatasetAnnotation(jobs);

    return { queued: jobs.length };
  }
}
