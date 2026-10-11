import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../database/prisma.service';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: { dataset: { findUnique: jest.Mock }; image: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      dataset: { findUnique: jest.fn() },
      image: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('404s for an unknown dataset', async () => {
    prisma.dataset.findUnique.mockResolvedValue(null);
    await expect(service.export('nope', 'yolo')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips label files for images without dimensions instead of throwing', async () => {
    prisma.dataset.findUnique.mockResolvedValue({ id: 'ds-1', name: 'DS' });
    prisma.image.findMany.mockResolvedValue([
      {
        id: 'img-1',
        width: null,
        height: null,
        originalName: 'no-dims.png',
        annotations: [
          { id: 'a1', label: 'car', confidence: 0.9, bbox: { x: 1, y: 2, width: 3, height: 4 }, polygon: null },
        ],
      },
      {
        id: 'img-2',
        width: 100,
        height: 50,
        originalName: 'good.png',
        annotations: [
          { id: 'a2', label: 'car', confidence: 0.9, bbox: { x: 10, y: 10, width: 20, height: 10 }, polygon: null },
        ],
      },
    ]);

    const zip = (await service.export('ds-1', 'yolo')) as Buffer;

    const text = zip.toString('latin1');
    expect(text).not.toContain('no-dims'); // dimension-less image skipped
    expect(text).toContain('labels/good.txt'); // valid image exported
  });

  it('disambiguates label files whose sanitized stems collide', async () => {
    prisma.dataset.findUnique.mockResolvedValue({ id: 'ds-1', name: 'DS' });
    prisma.image.findMany.mockResolvedValue([
      {
        id: 'img-aaaaaaaa-1111',
        width: 100,
        height: 100,
        originalName: 'photo.png',
        annotations: [
          { id: 'a1', label: 'car', confidence: 0.9, bbox: { x: 1, y: 1, width: 5, height: 5 }, polygon: null },
        ],
      },
      {
        id: 'img-bbbbbbbb-2222',
        width: 100,
        height: 100,
        originalName: 'photo.jpg', // same stem "photo"
        annotations: [
          { id: 'a2', label: 'car', confidence: 0.9, bbox: { x: 2, y: 2, width: 5, height: 5 }, polygon: null },
        ],
      },
    ]);

    const zip = (await service.export('ds-1', 'yolo')) as Buffer;
    const names = [...zip.toString('latin1').matchAll(/labels\/[A-Za-z0-9._-]+\.txt/g)].map((m) => m[0]);
    expect(new Set(names).size).toBe(2);
    expect(names).toContain('labels/photo.txt'); // first occurrence keeps the base stem
    expect(names).toContain('labels/photo-bbb-2222.txt'); // 2nd+ gets -<last 8 of image id>
  });
});
