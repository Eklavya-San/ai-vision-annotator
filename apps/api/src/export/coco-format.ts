/**
 * COCO JSON export helpers (pure functions — no I/O).
 *
 * COCO bounding boxes are `[x, y, width, height]` in pixel coordinates with
 * (x, y) at the TOP-LEFT corner — which is exactly the stored bbox shape, so
 * the mapping is a direct passthrough of {x, y, width, height} -> [x, y, width, height].
 *
 * COCO "polygon" annotations carry a flat point list `segmentation:
 * [x1, y1, x2, y2, ...]` derived from the stored polygon of {x, y} points.
 */

export interface CocoBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CocoAnnotation {
  /** stable unique id within the dataset */
  id: string;
  imageId: string;
  label: string;
  confidence: number | null;
  bbox: CocoBbox | null;
  polygon: Array<{ x: number; y: number }> | null;
}

export interface CocoImageInput {
  id: string;
  width: number;
  height: number;
  /** image-name without extension (used as COCO "file_name" stem) */
  imageName: string;
}

/** Derive a deterministic category id space — 1-based sequential numbers are
 * the classic COCO convention and keep the output compact. (Assigned inline
 * in buildCoco via an index map.) */

/**
 * Flatten an annotation's polygon into a COCO segmentation point list.
 * Returns an empty array (not null) when there is no polygon.
 */
export function polygonToPolygonList(
  polygon: Array<{ x: number; y: number }> | null | undefined,
): number[] {
  if (!polygon || polygon.length === 0) return [];
  const pts: number[] = [];
  for (const p of polygon) {
    pts.push(p.x, p.y);
  }
  return pts;
}

export interface YoloAnnotationInput {
  id: string;
  imageId: string;
  label: string;
  confidence: number | null;
  bbox: CocoBbox | null;
  polygon: Array<{ x: number; y: number }> | null;
}

export interface YoloImageInput {
  id: string;
  width: number;
  height: number;
  imageName: string;
}

export interface YoloDatasetOutput {
  info: Record<string, unknown>;
  images: Array<Record<string, unknown>>;
  annotations: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
}

/**
 * Map the collected dataset (images + annotations + label set) into a COCO
 * document. Deterministic ordering: images and annotations are ordered by their
 * input order; categories are alphabetically sorted for stable class ids.
 */
export function buildCoco(
  images: Array<YoloImageInput>,
  annotations: Array<YoloAnnotationInput>,
  datasetName: string,
): YoloDatasetOutput {
  // categories: unique labels, sorted, id = index+1
  const labels = Array.from(new Set(annotations.map((a) => a.label))).sort();
  const categoryId = new Map<string, number>();
  labels.forEach((l, i) => categoryId.set(l, i + 1));
  const categories = labels.map((label, i) => ({
    id: i + 1,
    name: label,
    supercategory: '',
  }));

  // image id space: 1-based in input order
  const imageId = new Map<string, number>();
  images.forEach((img, i) => imageId.set(img.id, i + 1));
  const cocoImages = images.map((img, i) => ({
    id: i + 1,
    file_name: img.imageName,
    width: img.width,
    height: img.height,
    date_captured: null,
    flickr_url: '',
    segmentation: false,
  }));

  // only emit annotations whose image is present
  // only emit annotations whose image is present — coerce to a loose record
  // shape so the downstream `annotations: Record<string, unknown>[]` satisfies
  // the return type without a narrowing type-predicate.
  const cocoAnnotations: Record<string, unknown>[] = [];
  annotations.forEach((a, i) => {
    const imgId = imageId.get(a.imageId);
    const catId = categoryId.get(a.label);
    if (imgId === undefined || catId === undefined) return;
    const polygonList = polygonToPolygonList(a.polygon);
    const bbox = a.bbox
      ? [a.bbox.x, a.bbox.y, a.bbox.width, a.bbox.height]
      : null;

    // COCO requires at least one of bbox/segmentation; prefer bbox, fall back
    // to segmentation (polygon).
    if (!bbox && polygonList.length === 0) return;

    cocoAnnotations.push({
      id: i + 1,
      image_id: imgId,
      category_id: catId,
      bbox: bbox ?? [0, 0, 0, 0],
      area: a.bbox ? a.bbox.width * a.bbox.height : computeAreaFromPolygon(a.polygon),
      segmentation: polygonList,
      iscrowd: 0,
      // confidence (model) is not part of classic COCO; carry it through a
      // well-known extension key so downstream tools ignore it.
      score: a.confidence === null ? null : a.confidence,
    });
  });

  return {
    info: {
      description: datasetName,
      version: '2.0',
      year: new Date().getFullYear(),
      contributor: 'ai-vision-annotator',
      url: '',
      date_created: new Date().toISOString(),
    },
    images: cocoImages,
    annotations: cocoAnnotations,
    categories,
  };
}

function computeAreaFromPolygon(
  polygon: Array<{ x: number; y: number }> | null,
): number {
  if (!polygon || polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}
