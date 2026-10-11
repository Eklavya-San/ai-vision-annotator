'use client';

import * as React from 'react';
import Link from 'next/link';
import { createProject, getProjects } from '@/lib/api';
import type { ProjectListItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { inputClass, labelClass, textareaClass, requiredMark } from '@/components/ui/input';

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<ProjectListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: '', description: '' });

  const load = React.useCallback(async () => {
    try {
      setError(null);
      setProjects(await getProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createProject({ name: form.name.trim(), description: form.description.trim() || undefined });
      setForm({ name: '', description: '' });
      setDialogOpen(false);
      await load();
    } catch (err) {
      // Show inside the dialog so it isn't hidden behind the overlay.
      setFormError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize datasets and annotation work by project.
          </p>
        </div>
        <Button onClick={() => { setFormError(null); setDialogOpen(true); }}>
          <PlusIcon /> New Project
        </Button>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!projects ? (
        <SkeletonGrid />
      ) : projects.length === 0 ? (
        <EmptyState onCreate={() => { setFormError(null); setDialogOpen(true); }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="p-name">Name{requiredMark}</label>
            <input
              id="p-name"
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Street Sign Inventory"
              required
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="p-desc">Description (optional)</label>
            <textarea
              id="p-desc"
              className={textareaClass}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Project</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary">{project.name}</h3>
        <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {project._count.datasets} {project._count.datasets === 1 ? 'dataset' : 'datasets'}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {project.description || <span className="italic text-muted-foreground/60">No description</span>}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">Created {formatDate(project.createdAt)}</p>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card/60" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FolderIcon />
      </div>
      <h3 className="text-base font-semibold">No projects yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create a project to organize your datasets, images, and annotations.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <PlusIcon /> Create your first project
      </Button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
