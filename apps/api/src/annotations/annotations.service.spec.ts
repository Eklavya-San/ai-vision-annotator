import { Test, TestingModule } from '@nestjs/testing';
import { AnnotationsService } from './annotations.service';
import { PrismaService } from '../database/prisma.service';

describe('AnnotationsService.update', () => {
  let service: AnnotationsService;
  let prisma: { annotation: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      annotation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ann-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ann-1', isCorrected: true }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnotationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<AnnotationsService>(AnnotationsService);
  });

  it('ignores explicit null polygon instead of throwing', async () => {
    await service.update('ann-1', { polygon: null as unknown as never });
    const data = prisma.annotation.update.mock.calls[0][0].data;
    expect(data.polygon).toBeUndefined();
    expect(data.isCorrected).toBe(true);
  });

  it('ignores explicit null bbox instead of writing an empty object', async () => {
    await service.update('ann-1', { bbox: null as unknown as never });
    const data = prisma.annotation.update.mock.calls[0][0].data;
    expect(data.bbox).toBeUndefined();
  });
});
