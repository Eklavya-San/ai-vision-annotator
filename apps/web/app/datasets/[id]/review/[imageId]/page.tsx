'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  getDataset,
  listImages,
  getImageAnnotations,
  updateAnnotation,
  deleteAnnotation,
} from '@/lib/api';
import type {
  Annotation,
  Dataset,
  DatasetImage,
  UpdateAnnotationInput,
} from '@/lib/types';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { Sidebar } from './components/Sidebar';

export default function ReviewPage() {
  const params = useParams<{ id: string; imageId: string }>();
  const datasetId = params.id;
  const imageId = params.imageId;

  const [dataset, setDataset] = React.useState<Dataset | null>(null);
  const [images, setImages] = React.useState<DatasetImage[] | null>(null);
  const [annotations, setAnnotations] = React.useState<Annotation[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Map<string, UpdateAnnotationInput>>(new Map());
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const [d, imgs, anns] = await Promise.all([
        getDataset(datasetId),
        listImages(datasetId),
        getImageAnnotations(imageId),
      ]);
      setDataset(d);
      setImages(imgs);
      setAnnotations(anns);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load image');
    } finally {
      setDrafts(new Map());
      setSelectedId(null);
      setSavingId(null);
    }
  }, [datasetId, imageId]);

  React.useEffect(() => { void load(); }, [load]);

  const image = (images ?? []).find((i) => i.id === imageId) ?? null;
  const index = images ? images.findIndex((i) => i.id === imageId) : -1;
  const prev = index > 0 ? images![index - 1] : null;
  const next = index >= 0 && index < images!.length - 1 ? images![index + 1] : null;

  function markDirty(annId: string, patch: UpdateAnnotationInput) {
    setJustSaved(false);
    setDrafts((prev) => {
      const m = new Map(prev);
      m.set(annId, { ...m.get(annId), ...patch });
      return m;
    });
  }

  function mergeDirty(annId: string, patch: UpdateAnnotationInput) {
    setJustSaved(false);
    setAnnotations((list) =>
      (list ?? []).map((a) => {
        if (a.id !== annId) return a;
        const d = drafts.get(annId) ?? {};
        return { ...a, ...d, ...patch, isCorrected: true } as Annotation;
      }),
    );
    setDrafts((prev) => {
      const m = new Map(prev);
      m.set(annId, { ...m.get(annId), ...patch });
      return m;
    });
  }

  function onBboxChange(id: string, bbox: { x: number; y: number; width: number; height: number }) {
    mergeDirty(id, { bbox });
  }

  function onLabelChange(id: string, label: string) {
    mergeDirty(id, { label });
  }

  async function onDelete(id: string) {
    try {
      await deleteAnnotation(id);
      setAnnotations((list) => (list ?? []).filter((a) => a.id !== id));
      if (selectedId === id) setSelectedId(null);
      setDrafts((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete annotation');
    }
  }

  async function onSave(id: string, patch: UpdateAnnotationInput): Promise<boolean> {
    const d = drafts.get(id);
    const body: UpdateAnnotationInput = d ? { ...d, ...patch } : patch;
    setSavingId(id);
    setJustSaved(false);
    try {
      const updated = await updateAnnotation(id, body);
      setAnnotations((list) =>
        (list ?? []).map((a) => (a.id === id ? updated : a)),
      );
      setDrafts((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
      setJustSaved(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setSavingId(null);
    }
  }

  const router = useRouter();

  // Navigate to another image, auto-saving any dirty annotations first.
  async function handleNavigate(target: DatasetImage | undefined | null) {
    if (!target) return;
    if (dirtyIds.length > 0) {
      const results = await Promise.all(dirtyIds.map((id) => onSave(id, {})));
      if (results.some((ok) => !ok)) {
        const discard = window.confirm(
          'Some changes failed to save. Discard unsaved edits and continue?',
        );
        if (!discard) return;
      }
    }
    router.push(`/datasets/${datasetId}/review/${target.id}`);
  }

  // Keyboard shortcuts: [ prev, ] next
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '[' && prev) {
        e.preventDefault();
        void handleNavigate(prev);
      } else if (e.key === ']' && next) {
        e.preventDefault();
        void handleNavigate(next);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error && !dataset) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Link href={`/datasets/${datasetId}`} className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to dataset
          </Link>
        </div>
      </div>
    );
  }

  if (!dataset || !images || !annotations || !image) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">Loading review view…</div>;
  }

  const mergedAnnotations = (annotations ?? []).map((a) => {
    const d = drafts.get(a.id);
    return d ? ({ ...a, ...d, isCorrected: true } as Annotation) : a;
  });
  const dirtyIds = Array.from(drafts.keys());

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/datasets/${datasetId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to {dataset.name}
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs tabular-nums text-muted-foreground">
            {index + 1} / {images.length}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={!prev}
            onClick={() => { void handleNavigate(prev); }}
          >
            ← Prev <kbd className="ml-1 rounded border border-border px-1 text-[11px]">[</kbd>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!next}
            onClick={() => { void handleNavigate(next); }}
          >
            Next → <kbd className="ml-1 rounded border border-border px-1 text-[11px]">]</kbd>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[560px]">
          <AnnotationCanvas
            image={image}
            annotations={mergedAnnotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBboxChange={onBboxChange}
          />
          {error && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
        <div className="min-h-[560px]">
          <Sidebar
            dataset={dataset}
            annotations={mergedAnnotations}
            selectedId={selectedId}
            dirtyIds={dirtyIds}
            onSelect={setSelectedId}
            onLabelChange={onLabelChange}
            onDelete={onDelete}
            onSave={onSave}
            saved={justSaved}
            savingId={savingId}
          />
        </div>
      </div>
    </div>
  );
}
