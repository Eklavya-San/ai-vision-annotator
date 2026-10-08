// Client domain types — shaped to match the API responses (see apps/api).
// BigInt (sizeBytes) and DateTime (createdAt/updatedAt) are serialized to
// string / ISO-string by the API's TransformBigIntInterceptor.

export type ImageStatus = 'uploaded' | 'processing' | 'annotated' | 'failed';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  imageId: string;
  label: string;
  /** 0..1 (or null). */
  confidence: number | null;
  /** Pixel coordinates of the source image. */
  bbox: BBox | null;
  polygon: PolygonPoint[] | null;
  isCorrected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends Project {
  _count: { datasets: number };
}

export interface ProjectDetail extends Project {
  datasets: Dataset[];
}

export interface Dataset {
  id: string;
  projectId: string;
  projectName: string;
  modelId: string | null;
  name: string;
  instructions: string | null;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetImage {
  id: string;
  datasetId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  status: ImageStatus | string;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
  annotationCount: number;
}

export interface PresignUpload {
  uploadUrl: string;
  storageKey: string;
  contentType: string;
}

/** Payload accepted by `PUT /api/annotations/:id`. */
export interface UpdateAnnotationInput {
  label?: string;
  confidence?: number;
  bbox?: BBox;
  polygon?: PolygonPoint[];
}
