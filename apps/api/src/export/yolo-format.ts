/**
 * YOLO .txt label format helpers (pure functions — no I/O, easy to unit test).
 *
 * Each non-empty line: `<class_id> <x_center> <y_center> <width> <height>`
 * where all coordinates are normalized to 0.0–1.0 relative to image size.
 *
 * The stored bbox is axis-aligned `{ x, y, width, height }` in image pixels
 * with (x, y) at the TOP-LEFT corner, matching the provider output schema.
 */

export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clamp a normalized YOLO coordinate to the inclusive [0, 1] range. */
export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Convert a pixel bbox to normalized YOLO center-x / center-y / width / height.
 */
export function bboxToYolo(
  bbox: Bbox,
  imageWidth: number,
  imageHeight: number,
): { cx: number; cy: number; yw: number; yh: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error(`Invalid image dimensions: ${imageWidth}x${imageHeight}`);
  }

  const cx = clamp01((bbox.x + bbox.width / 2) / imageWidth);
  const cy = clamp01((bbox.y + bbox.height / 2) / imageHeight);
  const yw = clamp01(bbox.width / imageWidth);
  const yh = clamp01(bbox.height / imageHeight);
  return { cx, cy, yw, yh };
}

/** Format one YOLO line for a single annotation. */
export function formatYoloLine(
  classId: number,
  bbox: Bbox,
  imageWidth: number,
  imageHeight: number,
): string {
  const { cx, cy, yw, yh } = bboxToYolo(bbox, imageWidth, imageHeight);
  return [classId, fmt6(cx), fmt6(cy), fmt6(yw), fmt6(yh)].join(' ');
}

/** Round to 6 decimals and emit a clean minimal decimal string (trailing
 * zeros dropped, no scientific notation) — the convention YOLO tooling uses. */
function fmt6(v: number): string {
  return Number(v.toFixed(6)).toString();
}

export interface YoloImageInput {
  /** Annotations that have a bbox on this image. */
  annotations: Array<{ bbox: Bbox; label: string }>;
  width: number;
  height: number;
  /** label -> zero-based class index */
  classIndex: Map<string, number>;
}

/**
 * Produce the full .txt content for one image (one line per annotation,
 * in deterministic order). Returns `'\n'`-joined lines plus a trailing
 * newline (YOLO .txt files end in a newline).
 */
export function yoloFileForImage(image: YoloImageInput): string {
  if (image.annotations.length === 0) return '';
  return (
    image.annotations
      .map(({ bbox, label }) => {
        const classId = image.classIndex.get(label);
        if (classId === undefined) return '';
        return formatYoloLine(classId, bbox, image.width, image.height);
      })
      .filter((line) => line.length > 0)
      .join('\n') + '\n'
  );
}
