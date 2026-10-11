const MAP: Record<string, { label: string; className: string; dot: string }> = {
  uploaded:   { label: 'Uploaded',   className: 'bg-slate-500/15 text-slate-300 border-slate-500/40',   dot: 'bg-slate-400' },
  processing: { label: 'Processing', className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',   dot: 'bg-amber-400 animate-pulse' },
  annotated:  { label: 'Annotated',  className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
  failed:     { label: 'Failed',     className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',       dot: 'bg-rose-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? {
    label: status,
    className: 'bg-white/10 text-white/70 border-white/20',
    dot: 'bg-white/40',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function LabelBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
      {label}
    </span>
  );
}
