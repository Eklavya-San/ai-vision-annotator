'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { LabelBadge } from '@/components/ui/Badge';
import { inputClass, labelClass, textareaClass, focusRingClass, requiredMark } from '@/components/ui/input';
import { createDataset, getProject } from '@/lib/api';
import type { ProjectDetail } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [data, setData] = React.useState<ProjectDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({ name: '', instructions: '' });
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setData(await getProject(projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project');
    }
  }, [projectId]);

  React.useEffect(() => { void load(); }, [load]);

  function commitTag(raw: string) {
    const clean = raw.replace(/,$/, '').trim();
    if (!clean) return;
    if (!tags.includes(clean)) setTags((t) => [...t, clean]);
    setTagInput('');
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  }

  function handleTagBlur() {
    if (tagInput.trim()) commitTag(tagInput);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const labels = [...tags];
    if (!labels.length) return;
    if (!form.name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createDataset(projectId, {
        name: form.name.trim(),
        labels,
        instructions: form.instructions.trim() || '',
      });
      setForm({ name: '', instructions: '' });
      setTags([]);
      setDialogOpen(false);
      await load();
    } catch (err) {
      // Show inside the dialog so it isn't hidden behind the overlay.
      setFormError(err instanceof Error ? err.message : 'Failed to create dataset');
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveLabels = tags;

  if (error && !data) {
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

  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">Loading project…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/projects" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to projects
      </Link>

      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          {data.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.description}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Created {formatDate(data.createdAt)}</p>
        </div>
        <Button onClick={() => { setFormError(null); setDialogOpen(true); }}>
          <PlusIcon /> New Dataset
        </Button>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Datasets</h2>
        {data.datasets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No datasets yet. Create one to start uploading images.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.datasets.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/datasets/${d.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon />
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.labels.length} labels · {formatDate(d.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:max-w-md">
                    {d.labels.slice(0, 4).map((l) => (
                      <LabelBadge key={l} label={l} />
                    ))}
                    {d.labels.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{d.labels.length - 4}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Dataset">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="d-name">Dataset name{requiredMark}</label>
            <input
              id="d-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="City crosswalks"
              required
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="d-labels">Target labels{requiredMark}</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((x) => x.filter((v) => v !== t))}
                    aria-label={`Remove ${t}`}
                    className={`-m-1 rounded p-1 leading-none hover:bg-primary/20 ${focusRingClass}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="d-labels"
                value={tagInput}
                className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={tags.length ? 'Add more…' : 'car, truck, pedestrian (press Enter)'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.endsWith(',')) commitTag(v);
                  else setTagInput(v);
                }}
                onKeyDown={handleTagKeyDown}
                onBlur={handleTagBlur}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Type a label and press <kbd className="rounded border border-border px-1">Enter</kbd> to confirm. Used to
              build the YOLO <code className="rounded bg-background px-1">data.yaml</code>.
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor="d-instructions">Vision model instructions</label>
            <textarea
              id="d-instructions"
              className={textareaClass}
              rows={4}
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              placeholder="Focus on traffic participants in the foreground. Return only bboxes for vehicles and people…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!form.name.trim() || effectiveLabels.length === 0}>
              Create Dataset
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function PlusIcon() {
  return <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function FileIcon() {
  return (
    <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3v5h5M6 3h8l5 5v13H6V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
