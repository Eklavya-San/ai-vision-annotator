import { z } from 'zod';

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const bboxSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().nonnegative().finite(),
  height: z.number().nonnegative().finite(),
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
