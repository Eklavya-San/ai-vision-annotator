export const ANNOTATION_QUEUE = 'annotation';

export interface AnnotationJobData {
  datasetId: string;
  imageId: string;
  storageKey: string;
  instructions: string;
  labels: string[];
}
