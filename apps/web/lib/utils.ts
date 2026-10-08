import type { PolygonPoint } from './types';

/** Deterministic, readable color for a class label (stable across renders). */
const PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#e11d48',
];

export function labelColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** rgba() of the label colour with reduced alpha, for box fills. */
export function labelFill(label: string): string {
  return `${labelColor(label)}22`; // ~13% alpha
}

export function formatPercent(confidence: number | null): string {
  if (confidence == null) return '—';
  return `${Math.round(confidence * 100)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Bbox center + corner points in *source image pixel* space. Returns null for
 * polygons or a missing bbox (only bboxes are resizable on the canvas).
 */
export function bboxCorners(bbox: { x: number; y: number; width: number; height: number }) {
  return {
    cx: bbox.x + bbox.width / 2,
    cy: bbox.y + bbox.height / 2,
    tl: { x: bbox.x, y: bbox.y },
    tr: { x: bbox.x + bbox.width, y: bbox.y },
    bl: { x: bbox.x, y: bbox.y + bbox.height },
    br: { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
  };
}

/** Reconstruct a bbox from an anchor corner + opposite corner (clamped to ≥1px). */
export function bboxFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(1, Math.abs(b.x - a.x));
  const height = Math.max(1, Math.abs(b.y - a.y));
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function polygonPath(points: PolygonPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * SHA-256 of a File as a lowercase hex string. Uses the SubtleCrypto API on
 * Node 18+/modern browsers. Required to register an image with the API.
 */
export async function sha256Hex(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
