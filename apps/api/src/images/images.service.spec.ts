import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImagesService } from './images.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../database/prisma.service';

describe('ImagesService', () => {
  let service: ImagesService;
  let prisma: {
    dataset: { findUniqueOrThrow: jest.Mock };
    image: { create: jest.Mock };
  };
  let storage: { createUploadUrl: jest.Mock; objectSize: jest.Mock };

  beforeEach(async () => {
    prisma = {
      dataset: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'ds-1' }) },
      image: { create: jest.fn().mockResolvedValue({ id: 'img-1' }) },
    };
    storage = {
      createUploadUrl: jest.fn().mockResolvedValue('http://signed'),
      objectSize: jest.fn().mockResolvedValue(70),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
  });

  describe('createPresignedUpload', () => {
    it('sanitizes the filename into the object key', async () => {
      await service.createPresignedUpload('ds-1', {
        filename: '../../my evil NAME.png',
        mimeType: 'image/png',
      });
      const key = storage.createUploadUrl.mock.calls[0][0] as string;
      expect(key).toMatch(/^datasets\/ds-1\/[0-9a-f-]{36}-my_evil_NAME\.png$/);
    });

    it('falls back to "image" when nothing safe remains', async () => {
      await service.createPresignedUpload('ds-1', {
        filename: '???',
        mimeType: 'image/png',
      });
      const key = storage.createUploadUrl.mock.calls[0][0] as string;
      expect(key).toMatch(/^datasets\/ds-1\/[0-9a-f-]{36}-image$/);
    });
  });

  describe('registerImage', () => {
    const dto = {
      storageKey: `datasets/ds-1/11111111-1111-1111-1111-111111111111-verify.png`,
      originalName: 'verify.png',
      mimeType: 'image/png',
      sizeBytes: 70,
      sha256: 'a'.repeat(64),
      width: 100,
      height: 100,
    };

    it('creates the image when dataset, key and object all check out', async () => {
      await service.registerImage('ds-1', dto);
      expect(prisma.image.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ datasetId: 'ds-1', storageKey: dto.storageKey }),
      });
    });

    it('rejects keys that belong to another dataset', async () => {
      await expect(
        service.registerImage('ds-1', {
          ...dto,
          storageKey: 'datasets/OTHER/11111111-1111-1111-1111-111111111111-x.png',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.image.create).not.toHaveBeenCalled();
    });

    it('rejects when no object was uploaded for the key', async () => {
      storage.objectSize.mockResolvedValue(null);
      await expect(service.registerImage('ds-1', dto)).rejects.toThrow(
        'No object was uploaded',
      );
    });

    it('rejects when the declared size does not match the object', async () => {
      storage.objectSize.mockResolvedValue(999);
      await expect(service.registerImage('ds-1', dto)).rejects.toThrow(
        'does not match uploaded object',
      );
    });
  });
});
