import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { AnnotationProcessor } from './annotation.processor';
import { StorageService } from '../storage/storage.service';
import { ProvidersService } from '../providers/providers.service';
import { PrismaService } from '../database/prisma.service';

describe('AnnotationProcessor', () => {
  let processor: AnnotationProcessor;
  let providers: { annotate: jest.Mock };
  let prisma: {
    image: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: { annotation: { deleteMany: jest.Mock; createMany: jest.Mock }; image: { update: jest.Mock } };

  beforeEach(async () => {
    jest.clearAllMocks();
    providers = { annotate: jest.fn().mockResolvedValue({ annotations: [] }) };
    tx = {
      annotation: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      image: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      image: { findUnique: jest.fn().mockResolvedValue({ width: 100, height: 100 }), update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnotationProcessor,
        { provide: StorageService, useValue: { createDownloadUrl: jest.fn().mockResolvedValue('http://signed') } },
        { provide: ProvidersService, useValue: providers },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get<AnnotationProcessor>(AnnotationProcessor);
  });

  function run(labels: string[]) {
    return processor.process({
      data: { datasetId: 'ds-1', imageId: 'img-1', storageKey: 'k', instructions: '', labels },
    } as unknown as Job);
  }

  it('keeps all annotations when the dataset defines no labels (empty allowlist = keep-all)', async () => {
    providers.annotate.mockResolvedValue({
      annotations: [{ label: 'anything', confidence: 0.8, bbox: { x: 1, y: 1, width: 2, height: 2 } }],
    });
    await run([]);
    expect(tx.annotation.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ label: 'anything' })],
    });
  });

  it('drops annotations whose label is outside the dataset label set', async () => {
    providers.annotate.mockResolvedValue({
      annotations: [
        { label: 'car', confidence: 0.9, bbox: { x: 1, y: 1, width: 2, height: 2 } },
        { label: 'alien', confidence: 0.5, bbox: { x: 2, y: 2, width: 2, height: 2 } },
      ],
    });
    await run(['car']);
    const data = tx.annotation.createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].label).toBe('car');
  });

  it('marks the image annotated inside the transaction', async () => {
    await run(['car']);
    expect(tx.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { status: 'annotated' },
    });
  });
});
