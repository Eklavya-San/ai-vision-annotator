'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { focusRingClass } from '@/components/ui/input';
import { StatusBadge, LabelBadge } from '@/components/ui/Badge';
import { listImages, triggerAnnotation, getDataset, downloadExport } from '@/lib/api';
import type { Dataset, DatasetImage } from '@/lib/types';
import { ImageGrid } from './components/ImageGrid';
import { Uploader } from './components/Uploader';

export default function DatasetPage() {
  const params = useParams<{ id: string }>();
  const datasetId = params.id;

  const [dataset, setDataset] = React.useState<Dataset | null>(null);
  const [images, setImages] = React.useState<DatasetImage[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [annState, setAnnState] = React.useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [annMsg, setAnnMsg] = React.useState<string>('');

  async function load() {
    try {
      setError(null);
      const [d, imgs] = await Promise.all([getDataset(datasetId), listImages(datasetId)]);
      setDataset(d);
      setImages(imgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dataset');
    }
  }

  React.useEffect(() => { void load(); }, [datasetId]);

  // Poll for image status changes while any image is `processing` (skips hidden tabs).
  const anyProcessing = React.useMemo(
    () => (images ?? []).some((i) => i.status === 'processing' || i.status === 'uploaded'),
    [images],
  );
  React.useEffect(() => {
    if (!anyProcessing || annState === 'error') return;
    const t = setInterval(() => {
      if (document.hidden) return;
      listImages(datasetId).then(setImages).catch(() => {});
    }, 2500);
    return () => clearInterval(t);
  }, [anyProcessing, annState, datasetId]);

  async function handleAnnotate() {
    setAnnState('running');
    setAnnMsg('');
    try {
      const res = await triggerAnnotation(datasetId);
      if (res.accepted === 0) {
        setAnnState('error');
        setAnnMsg('No images are ready to annotate. Upload some first.');
      } else {
        setAnnState('done');
        setAnnMsg(`Accepted ${res.accepted} image(s) for annotation.`);
        // Refresh so status flips to 'processing'.
        setTimeout(() => listImages(datasetId).then(setImages).catch(() => {}), 400);
      }
    } catch (e) {
      setAnnState('error');
      setAnnMsg(e instanceof Error ? e.message : 'Annotation failed');
    }
  }

  if (error && !images) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Link href="/projects" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">Loading dataset…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href={`/projects/${dataset.projectId}`} className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to {dataset.projectName}
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{dataset.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dataset.labels.length ? (
                dataset.labels.map((l) => <LabelBadge key={l} label={l} />)
              ) : (
                <span className="text-sm text-muted-foreground">No labels defined</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAnnotate}
              loading={annState === 'running'}
              disabled={annState === 'running'}
            >
              {annState === 'running' ? 'Annotating…' : 'Annotate Dataset'}
            </Button>
            <ExportMenu datasetId={datasetId} name={dataset.name} />
          </div>
        </div>
        <div aria-live="polite">
          {annState === 'error' && (
            <p role="alert" className="mt-3 inline-block rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              {annMsg}
            </p>
          )}
          {annState === 'done' && (
            <p role="status" className="mt-3 inline-block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
              {annMsg}
            </p>
          )}
          {anyProcessing && (
            <p role="status" className="mt-2 text-xs text-amber-300">
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 align-middle" />
              Pipeline is processing… auto-refreshing status.
            </p>
          )}
        </div>
      </header>

      <Uploader datasetId={datasetId} labels={dataset.labels} onUploaded={() => listImages(datasetId).then(setImages).catch(() => {})} />

      <ImageGrid datasetId={datasetId} images={images ?? []} />
    </div>
  );
}

function ExportMenu({ datasetId, name }: { datasetId: string; name: string }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function download(format: 'yolo' | 'coco') {
    const safe = name.replace(/\s+/g, '-').toLowerCase();
    downloadExport(datasetId, format, `${safe}.${format === 'yolo' ? 'yolo.zip' : 'coco.json'}`);
    close();
  }

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="secondary"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => close(false)} aria-hidden />
          <div role="menu" aria-label="Export format" className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-border bg-card p-1 shadow-xl">
            <p className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Download as</p>
            {(['yolo', 'coco'] as const).map((fmt) => (
              <button
                key={fmt}
                role="menuitem"
                onClick={() => download(fmt)}
                className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${focusRingClass}`}
              >
                <span className="mt-0.5 h-2 w-2 rounded-full bg-primary/70" aria-hidden />
                <span>
                  <span className="font-medium capitalize">{fmt}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fmt === 'yolo' ? 'Yolo label .txt + data.yaml (zip)' : 'Standard COCO JSON (zip)'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
