import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PresignUploadDto, RegisterImageDto } from './dto/register-image.dto';

/**
 * Prisma image-row shape, inferred from the generated Prisma client so it can
 * never drift from the schema. A bare `findMany()` return is `Promise<Image[]>`,
 * so `[number]` is exactly the model row.
 */
export type DbImage = Awaited<ReturnType<typeof PrismaClient.prototype.image.findMany>>[number];

/**
 * A stored image DB row plus the presigned download URL the service computes.
 * `downloadUrl` rides along on the Prisma-derived row via intersection.
 */
export type ImageWithDownloadUrl = DbImage & { downloadUrl: string };

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createPresignedUpload(
    datasetId: string,
    dto: PresignUploadDto,
  ): Promise<{ key: string; storageKey: string; uploadUrl: string; contentType: string }> {
    // Server owns the key layout: fixed prefix, fresh uuid, sanitized name.
    const base = dto.filename.split(/[\\/]/).pop() ?? 'image';
    const safe = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'image';
    const key = `datasets/${datasetId}/${randomUUID()}-${safe}`;
    const uploadUrl = await this.storage.createUploadUrl(key, dto.mimeType);
    return { key, storageKey: key, uploadUrl, contentType: dto.mimeType };
  }

  async registerImage(datasetId: string, dto: RegisterImageDto) {
    // 404 via PrismaExceptionFilter when the dataset does not exist.
    await this.prisma.dataset.findUniqueOrThrow({
      where: { id: datasetId },
      select: { id: true },
    });

    // The key must belong to THIS dataset — blocks cross-dataset references.
    if (!dto.storageKey.startsWith(`datasets/${datasetId}/`)) {
      throw new BadRequestException('storageKey does not belong to this dataset');
    }

    // The object must actually exist and match the declared size.
    const actualSize = await this.storage.objectSize(dto.storageKey);
    if (actualSize === null) {
      throw new BadRequestException('No object was uploaded for this storageKey');
    }
    if (actualSize !== dto.sizeBytes) {
      throw new BadRequestException(
        `Declared size ${dto.sizeBytes} does not match uploaded object (${actualSize} bytes)`,
      );
    }

    // Duplicate sha256 within a dataset → P2002 → 409 via PrismaExceptionFilter.
    return this.prisma.image.create({
      data: {
        datasetId,
        storageKey: dto.storageKey,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        sha256: dto.sha256,
        width: dto.width,
        height: dto.height,
        status: 'uploaded',
      },
    });
  }

  async listImages(datasetId: string): Promise<Array<ImageWithDownloadUrl & { annotationCount: number }>> {
    const rows = await this.prisma.image.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        datasetId: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        width: true,
        height: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { annotations: true } },
      },
    });

    return Promise.all(
      rows.map(async (image) => ({
        ...image,
        downloadUrl: await this.storage.createDownloadUrl(image.storageKey),
        annotationCount: image._count.annotations,
      })),
    );
  }
}
