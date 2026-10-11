import { Test, TestingModule } from '@nestjs/testing';
import { DatasetsService } from './datasets.service';
import { AnnotationProducer } from '../queue/annotation.producer';
import { PrismaService } from '../database/prisma.service';

describe('DatasetsService', () => {
  let service: DatasetsService;
  let prisma: { dataset: { findUniqueOrThrow: jest.Mock } };
  let producer: { queueDatasetAnnotation: jest.Mock };

  beforeEach(async () => {
    prisma = { dataset: { findUniqueOrThrow: jest.fn() } };
    producer = { queueDatasetAnnotation: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnnotationProducer, useValue: producer },
      ],
    }).compile();

    service = module.get<DatasetsService>(DatasetsService);
  });

  describe('triggerAnnotation', () => {
    const image = (id: string, status: string) => ({ id, status, storageKey: `key-${id}` });

    it('queues only uploaded/failed images and reports the accepted count', async () => {
      prisma.dataset.findUniqueOrThrow.mockResolvedValue({
        id: 'ds-1',
        instructions: 'instr',
        labels: ['car'],
        images: [
          image('img-uploaded', 'uploaded'),
          image('img-failed', 'failed'),
          image('img-processing', 'processing'),
          image('img-annotated', 'annotated'),
        ],
      });

      const result = await service.triggerAnnotation('ds-1');

      expect(result).toEqual({ accepted: 2 });
      expect(producer.queueDatasetAnnotation).toHaveBeenCalledWith([
        expect.objectContaining({ imageId: 'img-uploaded' }),
        expect.objectContaining({ imageId: 'img-failed' }),
      ]);
    });

    it('returns accepted: 0 and skips the queue when nothing is ready', async () => {
      prisma.dataset.findUniqueOrThrow.mockResolvedValue({
        id: 'ds-1',
        instructions: '',
        labels: [],
        images: [image('img-annotated', 'annotated'), image('img-processing', 'processing')],
      });

      const result = await service.triggerAnnotation('ds-1');

      expect(result).toEqual({ accepted: 0 });
      expect(producer.queueDatasetAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('maps the included project onto projectName', async () => {
      prisma.dataset.findUniqueOrThrow.mockResolvedValue({
        id: 'ds-1',
        projectId: 'p-1',
        name: 'DS',
        instructions: null,
        labels: [],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        project: { name: 'My Project' },
      });

      const result = await service.findOne('ds-1');

      expect(result).toMatchObject({ projectName: 'My Project' });
      expect((result as Record<string, unknown>).project).toBeUndefined();
    });
  });
});
