import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ANNOTATION_QUEUE, AnnotationJobData } from './constants';

@Injectable()
export class AnnotationProducer {
  constructor(
    @InjectQueue(ANNOTATION_QUEUE) private readonly queue: Queue<AnnotationJobData>,
  ) {}

  async queueDatasetAnnotation(jobs: AnnotationJobData[]): Promise<void> {
    if (jobs.length === 0) return;

    await this.queue.addBulk(
      jobs.map((job) => ({
        name: 'annotate-image',
        data: job,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      })),
    );
  }
}
