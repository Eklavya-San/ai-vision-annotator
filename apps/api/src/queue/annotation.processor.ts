import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AnnotationJobData, ANNOTATION_QUEUE } from './constants';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProvidersService } from '../providers/providers.service';

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

      await this.prisma.image.update({
        where: { id: imageId },
        data: { status: 'annotated' },
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
