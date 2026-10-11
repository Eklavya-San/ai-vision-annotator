'use client';

import * as React from 'react';
import { uploadImage } from '@/lib/api';
import { focusRingClass } from '@/components/ui/input';

interface UploaderProps {
  datasetId: string;
  labels: string[];
  onUploaded: () => void;
}

type Phase = 'pending' | 'uploading' | 'done' | 'error';

interface ItemState {
  id: string;
  file: File;
  phase: Phase;
  error?: string;
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function Uploader({ datasetId, labels, onUploaded }: UploaderProps) {
  const [items, setItems] = React.useState<ItemState[]>([]);
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mirror of `items` so the upload loop always sees fresh state (fixes the
  // stale-closure bug where files added mid-batch were skipped).
  const itemsRef = React.useRef<ItemState[]>(items);
  itemsRef.current = items;
  const runningRef = React.useRef(false);

  const hasActive = items.some((i) => i.phase === 'pending' || i.phase === 'uploading');

  function patch(id: string, changes: Partial<Omit<ItemState, 'id'>>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setItems((prev) => [...prev, ...files.map((file) => ({ id: newId(), file, phase: 'pending' as const }))]);
    void processQueue();
  }

  async function processQueue() {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      // Upload strictly one at a time so progress + failures stay readable.
      for (;;) {
        const next = itemsRef.current.find((it) => it.phase === 'pending');
        if (!next) break;
        patch(next.id, { phase: 'uploading', error: undefined });
        try {
          await uploadImage(datasetId, next.file);
          patch(next.id, { phase: 'done' });
          onUploaded();
        } catch (e) {
          patch(next.id, {
            phase: 'error',
            error: e instanceof Error ? e.message : 'Upload failed',
          });
        }
      }
    } finally {
      runningRef.current = false;
    }
  }

  function retry(id: string) {
    patch(id, { phase: 'pending', error: undefined });
    void processQueue();
  }

  function clear() {
    if (hasActive) return; // Don't drop rows that are still in flight.
    setItems([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">Upload images</h2>
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          drag ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <UploadIcon />
        <p className="mt-3 text-sm font-medium">Drag & drop images here, or</p>
        <button
          type="button"
          className={`mt-2 text-sm text-primary hover:underline ${focusRingClass} rounded`}
          onClick={() => inputRef.current?.click()}
          disabled={hasActive}
        >
          {hasActive ? 'Uploading…' : 'browse files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
        />
        {labels.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Targeting: {labels.join(', ')}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-2" aria-label="Upload queue">
            {items.map((it) => (
              <li key={it.id} className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-3">
                  <FileThumb type={it.file.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(it.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  {it.phase === 'pending' && <Badge tone="muted">Queued</Badge>}
                  {it.phase === 'uploading' && <Badge tone="amber">Uploading…</Badge>}
                  {it.phase === 'done' && <Badge tone="green">Uploaded</Badge>}
                  {it.phase === 'error' && (
                    <>
                      <Badge tone="red">{it.error}</Badge>
                      <button
                        type="button"
                        onClick={() => retry(it.id)}
                        className={`shrink-0 rounded px-2 py-1 text-xs font-medium text-primary hover:underline ${focusRingClass}`}
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
                {it.phase === 'uploading' && (
                  <div
                    className="mt-2 h-1 w-full overflow-hidden rounded-full bg-primary/15"
                    role="progressbar"
                    aria-label={`Uploading ${it.file.name}`}
                  >
                    <div className="h-full w-1/3 animate-upload-slide rounded-full bg-primary" />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className={`rounded text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50 ${focusRingClass}`}
              onClick={clear}
              disabled={hasActive}
              title={hasActive ? 'Wait for uploads to finish' : undefined}
            >
              Clear list
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Badge({ tone, children }: { tone: 'muted' | 'amber' | 'green' | 'red'; children: React.ReactNode }) {
  const map = {
    muted: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  };
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

function UploadIcon() {
  return (
    <svg className="h-9 w-9 text-primary" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FileThumb({ type }: { type: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
      {type === 'image/png' ? <PngIcon /> : type === 'image/jpeg' ? <JpgIcon /> : <ImgIcon />}
    </div>
  );
}
function PngIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="9" r="1.5" fill="currentColor" /><path d="M4 16l5-4 4 3 4-5 3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function JpgIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M4 16l5-4 4 3 4-5 3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ImgIcon() { return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M3 16l5-4 5 3 4-5 4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
