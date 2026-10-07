import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';

export interface VisionProvider {
  annotate(request: AnnotationRequest, config: VisionModelConfig): Promise<AnnotationResult>;
}
