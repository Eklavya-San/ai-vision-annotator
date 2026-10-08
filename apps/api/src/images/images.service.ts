import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PresignUploadDto, RegisterImageDto } from './dto/register-image.dto';

export interface ImageWithDownloadUrl {
  id: string;
  datasetId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  sha256: string;
  width: number | null;
  height: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  downloadUrl: string;
}

@Injectable()
export class ImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createPresignedUpload(datasetId: string, dto: PresignUploadDto): Promise<{ key: string; uploadUrl: string }> {
    const key = `datasets/${datasetId}/${randomUUID()}-${dto.filename}`;
    const uploadUrl = await this.storage.createUploadUrl(key, dto.mimeType);
    return { key, uploadUrl };
  }

  registerImage(datasetId: string, dto: RegisterImageDto) {
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
