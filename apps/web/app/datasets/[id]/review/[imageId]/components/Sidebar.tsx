'use client';

import * as React from 'react';
import type { Annotation, Dataset, UpdateAnnotationInput } from '@/lib/types';
import { labelColor, formatPercent } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { focusRingClass } from '@/components/ui/input';

interface SidebarProps {
  dataset: Dataset;
  annotations: Annotation[];
  selectedId: string | null;
  dirtyIds: string[];
  onSelect: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onSave: (id: string, patch: UpdateAnnotationInput) => Promise<boolean>;
  saved: boolean;
  savingId: string | null;
}

export function Sidebar({
  dataset, annotations, selectedId, dirtyIds, onSelect, onLabelChange,
  onDelete, onSave, saved, savingId,
}: SidebarProps) {
  const selected = annotations.find((a) => a.id === selectedId) ?? null;
  const dirtyCount = dirtyIds.length;
  const selectedDirty = selected && dirtyIds.includes(selected.id);

  function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete the "${selected.label}" annotation? This cannot be undone.`)) return;
    onDelete(selected.id);
  }

  return (
    <aside className="flex h-full flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">Dataset</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{dataset.name}</p>
      </div>

      {/* Screen-reader announcements for save state changes. */}
      <p aria-live="polite" className="sr-only">
        {savingId ? 'Saving annotation…' : saved ? 'Annotation saved' : ''}
      </p>

      {selected && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Selected</p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: labelColor(selected.label) }} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={selected.label}>{selected.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {selected.bbox ? `${Math.round(selected.bbox.width)}×${Math.round(selected.bbox.height)} px` : `polygon · ${selected.polygon?.length ?? 0} pts`}
            {' · '}
            {formatPercent(selected.confidence)}
          </p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          Annotations
          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] text-slate-300">{annotations.length}</span>
          {dirtyCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">{dirtyCount} unsaved</span>
          )}
        </h4>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul className="space-y-2" aria-label="Annotations">
            {annotations.length === 0 && (
              <li className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No annotations yet.
              </li>
            )}
            {annotations.map((a) => {
              const color = labelColor(a.label);
              const isSel = a.id === selectedId;
              const isDirty = dirtyIds.includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    aria-current={isSel || undefined}
                    className={`w-full cursor-pointer rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSel
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={a.label}>{a.label}</span>
                      {a.isCorrected && (
                        <span title="Was corrected by a human" className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-amber-300">✓</span>
                      )}
                      <span className="shrink-0 text-xs text-muted-foreground" title="Model confidence">{formatPercent(a.confidence)}</span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground"
                      title={a.bbox ? `x:${a.bbox.x}, y:${a.bbox.y}, w:${a.bbox.width}, h:${a.bbox.height}` : `polygon · ${a.polygon?.length ?? 0} points`}>
                      {isDirty && <span className="mr-1 font-semibold text-amber-300">modified · </span>}
                      {a.bbox ? `x:${a.bbox.x}  y:${a.bbox.y}  ${a.bbox.width}×${a.bbox.height}` : `polygon · ${a.polygon?.length ?? 0} pts`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {selected ? (
          <>
            <select
              value={selected.label}
              onChange={(e) => onLabelChange(selected.id, e.target.value)}
              className={`h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs ${focusRingClass}`}
              aria-label="Reclassify selected annotation"
            >
              {dataset.labels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
              {!dataset.labels.includes(selected.label) && (
                <option value={selected.label}>{selected.label} (current)</option>
              )}
            </select>

            <Button size="sm" variant="danger" onClick={handleDelete}>
              Delete
            </Button>

            <Button
              size="sm"
              disabled={!selectedDirty || savingId === selected.id}
              loading={savingId === selected.id}
              onClick={() => { void onSave(selected.id, {}); }}
            >
              {savingId === selected.id ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </Button>
          </>
        ) : (
          <p className="w-full text-xs text-muted-foreground">Select an annotation to edit, reclassify, or delete it.</p>
        )}
      </div>
    </aside>
  );
}
