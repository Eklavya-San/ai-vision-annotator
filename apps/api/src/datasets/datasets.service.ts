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

  async findOne(id: string) {
    const dataset = await this.prisma.dataset.findUniqueOrThrow({
      where: { id },
      include: { project: { select: { name: true } } },
    });
    const { project, ...data } = dataset;
    return { ...data, projectName: project.name };
  }

  async triggerAnnotation(datasetId: string): Promise<{ accepted: number }> {
    const dataset = await this.prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      include: { images: true },
    });

    const instructions = dataset.instructions ?? '';
    const labels = (dataset.labels as string[] | undefined) ?? [];

    // Only queue images the pipeline can act on: freshly uploaded or
    // previously failed. Annotated images are skipped so a re-run never
    // wipes human-corrected annotations.
    const jobs: AnnotationJobData[] = dataset.images
      .filter((image) => image.status === 'uploaded' || image.status === 'failed')
      .map((image) => ({
        datasetId,
        imageId: image.id,
        storageKey: image.storageKey,
        instructions,
        labels,
      }));

    if (jobs.length > 0) {
      await this.producer.queueDatasetAnnotation(jobs);
    }

    return { accepted: jobs.length };
  }
}
