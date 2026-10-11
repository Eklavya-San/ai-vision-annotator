import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { buildZip, ZipEntry } from './zip-writer';
import { Bbox, yoloFileForImage } from './yolo-format';
import {
  CocoAnnotation,
  CocoImageInput,
  buildCoco,
} from './coco-format';

export type ExportFormat = 'yolo' | 'coco';

/**
 * Prisma annotation-row shape, inferred from the generated Prisma client so it
 * can never drift from the schema.
 */
type DbAnnotation = Awaited<ReturnType<typeof PrismaClient.prototype.annotation.findMany>>[number];

/**
 * Prisma image-row shape, inferred from the generated Prisma client.
 *
 * The public model type never carries the `annotations` relation, but this
 * export query selects it per image, so the relation is folded in here to type
 * the shape the rest of this module actually iterates over.
 */
type DbImage = Awaited<ReturnType<typeof PrismaClient.prototype.image.findMany>>[number] & {
  annotations: DbAnnotation[];
};

const COCO_EXTENSION_KEYS = ['jpg', 'jpeg', 'png'];

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export a dataset's annotations.
   *
   * - `yolo`: returns the raw ZIP buffer (`labels/<image>.txt` + `data.yaml`).
   * - `coco`: returns the raw JSON string (`images`/`annotations`/`categories`).
   *   The controller wraps each into the appropriate HTTP content type.
   */
  async export(datasetId: string, format: ExportFormat): Promise<Buffer | string> {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true, name: true },
    });
    if (!dataset) throw new NotFoundException(`Dataset ${datasetId} not found`);

    const images = await this.prisma.image.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        width: true,
        height: true,
        originalName: true,
        annotations: {
          select: {
            id: true,
            label: true,
            confidence: true,
            bbox: true,
            polygon: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Class list = every distinct label present in the dataset (annotation
    // level). Sorted for stable ids shared between data.yaml and COCO.
    const labels = Array.from(
      new Set(images.flatMap((img) => img.annotations.map((a) => a.label))),
    ).sort();
    const classIndex = new Map<string, number>();
    labels.forEach((l, i) => classIndex.set(l, i));

    if (format === 'yolo') {
      return this.buildYoloZip(images as unknown as DbImage[], classIndex, dataset.name);
    }
    // format === 'coco'
    return this.buildCocoJson(images as unknown as DbImage[], classIndex, dataset.name);
  }

  private buildYoloZip(
    images: DbImage[],
    classIndex: Map<string, number>,
    datasetName: string,
  ): Buffer {
    const entries: ZipEntry[] = [];
    const seenStems = new Map<string, number>();

    for (const img of images) {
      // Images with unknown dimensions cannot be normalized to YOLO
      // coordinates — skip their label file instead of failing the export.
      if (!img.width || !img.height) continue;
      const base = stemFor(img.originalName);
      const count = seenStems.get(base) ?? 0;
      seenStems.set(base, count + 1);
      // Deterministic disambiguation on collision: photo.png + photo.jpg
      // become photo.txt and photo-<last8 id>.txt.
      const stem = count === 0 ? base : `${base}-${img.id.slice(-8)}`;
      const bboxAnnotations = img.annotations
        .filter((a) => hasBbox(a.bbox))
        .map((a) => ({ bbox: a.bbox as unknown as Bbox, label: a.label }));

      const content = yoloFileForImage({
        annotations: bboxAnnotations,
        width: img.width ?? 0,
        height: img.height ?? 0,
        classIndex,
      });

      entries.push({ name: `labels/${stem}.txt`, data: Buffer.from(content, 'utf8') });
    }

    // data.yaml: YOLO dataset manifest
    const dataYaml = [
      'path: .',
      `name: ${yamlScalar(datasetName)}`,
      `train: images`,
      `val: images`,
      '',
      'nc: ' + classIndex.size,
      `names:`,
      ...Array.from(classIndex.keys(), (label, i) => `  ${i}: ${yamlScalar(label)}`),
      '',
    ].join('\n');

    entries.push({ name: 'data.yaml', data: Buffer.from(dataYaml, 'utf8') });

    return buildZip(entries);
  }

  private buildCocoJson(
    images: DbImage[],
    classIndex: Map<string, number>,
    datasetName: string,
  ): string {
    const cocoImages: CocoImageInput[] = images.map((img) => ({
      id: img.id,
      width: img.width ?? 0,
      height: img.height ?? 0,
      imageName: stemFor(img.originalName),
    }));

    const cocoAnnotations: CocoAnnotation[] = [];
    for (const img of images) {
      for (const a of img.annotations) {
        cocoAnnotations.push({
          id: a.id,
          imageId: img.id,
          label: a.label,
          confidence: a.confidence,
          bbox: hasBbox(a.bbox) ? (a.bbox as unknown as Bbox) : null,
          polygon: hasPolygon(a.polygon) ? (a.polygon as Array<{ x: number; y: number }>) : null,
        });
      }
    }

    // buildCoco is pure; it maps id spaces to 1-based sequential numbers.
    const doc = buildCoco(cocoImages, cocoAnnotations, datasetName);
    return JSON.stringify(doc, null, 2);
  }
}

function stemFor(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  return stem.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'image';
}

function hasBbox(v: unknown): v is { x: number; y: number; width: number; height: number } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.width === 'number' &&
    typeof o.height === 'number'
  );
}

function hasPolygon(v: unknown): v is Array<{ x: number; y: number }> {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as Record<string, unknown>).x === 'number' &&
      typeof (p as Record<string, unknown>).y === 'number',
  );
}

/** Minimal safe YAML scalar: plain if it matches a safe token, else quoted. */
function yamlScalar(v: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(v)) return v;
  return `'${v.replace(/'/g, "''")}'`;
}
