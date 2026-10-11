import { z } from 'zod';

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const bboxSchema = z.object({
  x: z.number().finite().min(0),
  y: z.number().finite().min(0),
  width: z.number().positive().finite(), // zero-size boxes are noise
  height: z.number().positive().finite(),
});

export const annotationResultSchema = z.object({
  annotations: z.array(z.object({
    label: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
    bbox: bboxSchema.optional(),
    polygon: z.array(pointSchema).min(3).optional(),
  }).refine((annotation) => annotation.bbox || annotation.polygon, {
    message: 'Annotation must contain either bbox or polygon',
  })),
});

export type ValidatedAnnotationResult = z.infer<typeof annotationResultSchema>;

export class InvalidAnnotationResultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnnotationResultError';
  }
}

export function parseAnnotationResult(content: string): ValidatedAnnotationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidAnnotationResultError('Vision model returned invalid JSON');
  }

  const result = annotationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new InvalidAnnotationResultError(`Vision model returned invalid annotations: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Post-parse filtering of model output:
 * - drops annotations whose label is not in `allowedLabels` (when given),
 * - drops annotations that fall outside the image (when dimensions are known).
 */
export function sanitizeAnnotations(
  result: ValidatedAnnotationResult,
  opts: { allowedLabels?: string[]; imageWidth?: number | null; imageHeight?: number | null },
): ValidatedAnnotationResult {
  const allowed = opts.allowedLabels ? new Set(opts.allowedLabels) : null;
  const w = opts.imageWidth ?? null;
  const h = opts.imageHeight ?? null;

  const annotations = result.annotations.filter((a) => {
    if (allowed && !allowed.has(a.label)) return false;
    if (a.bbox && w !== null && h !== null) {
      return a.bbox.x + a.bbox.width <= w && a.bbox.y + a.bbox.height <= h;
    }
    if (a.polygon && w !== null && h !== null) {
      return a.polygon.every((p) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h);
    }
    return true;
  });

  return { annotations };
}
