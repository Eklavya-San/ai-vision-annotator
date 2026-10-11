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
  // No hard-coded locale: respect the viewer's locale.
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
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
