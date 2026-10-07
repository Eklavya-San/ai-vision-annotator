export type ProviderType = 'openai-compatible';

export interface VisionModelConfig {
  providerType: ProviderType;
  baseUrl: string;
  model: string;
}

export interface AnnotationRequest {
  imageUrl: string;
  instructions: string;
  labels: string[];
}

export interface AnnotationResult {
  annotations: Array<{
    label: string;
    confidence?: number;
    bbox?: { x: number; y: number; width: number; height: number };
    polygon?: Array<{ x: number; y: number }>;
  }>;
}
