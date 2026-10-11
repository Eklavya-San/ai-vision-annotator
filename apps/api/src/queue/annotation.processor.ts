import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AnnotationJobData, ANNOTATION_QUEUE } from './constants';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProvidersService } from '../providers/providers.service';
import { sanitizeAnnotations } from '../providers/annotation-result.schema';

@Processor(ANNOTATION_QUEUE)
@Injectable()
export class AnnotationProcessor extends WorkerHost {
  constructor(
    private readonly storage: StorageService,
    private readonly providers: ProvidersService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<AnnotationJobData>): Promise<void> {
    const { imageId, storageKey, instructions, labels } = job.data;

    try {
      await this.prisma.image.update({
        where: { id: imageId },
        data: { status: 'processing' },
      });

      const imageUrl = await this.storage.createDownloadUrl(storageKey);
      const result = await this.providers.annotate({ imageUrl, instructions, labels });

      const image = await this.prisma.image.findUnique({
        where: { id: imageId },
        select: { width: true, height: true },
      });
      const clean = sanitizeAnnotations(result, {
        allowedLabels: labels,
        imageWidth: image?.width ?? null,
        imageHeight: image?.height ?? null,
      });

      await this.prisma.$transaction(async (tx) => {
        // Re-runs replace prior annotations for the image (idempotent).
        await tx.annotation.deleteMany({ where: { imageId } });

        if (clean.annotations.length > 0) {
          await tx.annotation.createMany({
            data: clean.annotations.map((annotation) => ({
              imageId,
              label: annotation.label,
              confidence: annotation.confidence ?? null,
              bbox: annotation.bbox ?? undefined,
              polygon: annotation.polygon ?? undefined,
            })),
          });
        }

        await tx.image.update({
          where: { id: imageId },
          data: { status: 'annotated' },
        });
      });
    } catch (error) {
      await this.prisma.image.update({
        where: { id: imageId },
        data: { status: 'failed' },
      }).catch(() => undefined);
      throw error;
    }
  }
}
