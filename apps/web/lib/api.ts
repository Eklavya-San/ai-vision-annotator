import { sha256Hex } from './utils';
import type {
  Annotation,
  Dataset,
  DatasetImage,
  PresignUpload,
  Project,
  ProjectDetail,
  ProjectListItem,
  UpdateAnnotationInput,
} from './types';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let body: unknown;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'message' in (body as any)
        ? (body as any).message
        : typeof body === 'string'
          ? body
          : res.statusText) as string;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return (body === '' ? undefined : body) as T;
}

// ── Projects ─────────────────────────────────────────────────────────────
export const getProjects = () => request<ProjectListItem[]>('/projects');

export const getProject = (id: string) => request<ProjectDetail>(`/projects/${id}`);

export const createProject = (data: { name: string; description?: string }) =>
  request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });

// ── Datasets ─────────────────────────────────────────────────────────────
export const getDataset = (id: string) => request<Dataset>(`/datasets/${id}`);

export const createDataset = (
  projectId: string,
  data: { name: string; labels: string[]; instructions?: string },
) =>
  request<Dataset>(`/projects/${projectId}/datasets`, {
    method: 'POST',
    body: JSON.stringify({ name: data.name, labels: data.labels, instructions: data.instructions || '' }),
  });

// ── Images ───────────────────────────────────────────────────────────────
export const listImages = (datasetId: string) => request<DatasetImage[]>(`/datasets/${datasetId}/images`);

export const presignUpload = (datasetId: string, filename: string, mimeType: string) =>
  request<PresignUpload>(`/datasets/${datasetId}/images/presign`, {
    method: 'POST',
    body: JSON.stringify({ filename, mimeType }),
  });

export const registerImage = (
  datasetId: string,
  payload: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    width?: number;
    height?: number;
  },
) =>
  request<DatasetImage>(`/datasets/${datasetId}/images`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Full upload flow: request a presigned URL, PUT the file to S3, then register
 * the image with the API. Resolves when the row exists.
 */
export async function uploadImage(datasetId: string, file: File): Promise<DatasetImage> {
  const presign = await presignUpload(
    datasetId,
    file.name,
    file.type || 'application/octet-stream',
  );
  const uploadUrl = presign.uploadUrl;
  const storageKey = presign.storageKey || (presign as any).key;
  const contentType = presign.contentType || file.type || 'application/octet-stream';

  // Read dimensions client-side so the grid has aspect-ratio metadata.
  const { width, height } = await readImageDimensions(file).catch(() => ({ width: undefined, height: undefined }));

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  const sha256 = await sha256Hex(file);
  return registerImage(datasetId, {
    storageKey,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    sha256,
    width,
    height,
  });
}

function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: undefined, height: undefined });
    };
    img.src = url;
  });
}

// ── Annotation pipeline ──────────────────────────────────────────────────
export const triggerAnnotation = (datasetId: string) =>
  request<{ accepted: number }>(`/datasets/${datasetId}/annotate`, { method: 'POST' });

// ── Annotations ──────────────────────────────────────────────────────────
export const getImageAnnotations = (imageId: string) => request<Annotation[]>(`/images/${imageId}/annotations`);

export const updateAnnotation = (id: string, data: UpdateAnnotationInput) =>
  request<Annotation>(`/annotations/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteAnnotation = (id: string) =>
  request<Annotation>(`/annotations/${id}`, { method: 'DELETE' });

// ── Export ───────────────────────────────────────────────────────────────
export const getExportUrl = (datasetId: string, format: 'yolo' | 'coco') =>
  `${BASE_URL}/datasets/${datasetId}/export?format=${format}`;

export const downloadExport = (datasetId: string, format: 'yolo' | 'coco', filename: string) => {
  const a = document.createElement('a');
  a.href = getExportUrl(datasetId, format);
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};
