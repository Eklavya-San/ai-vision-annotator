export const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const labelClass = 'block text-sm font-medium mb-1.5 text-foreground';

export const textareaClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-y';

/** Shared focus ring for raw buttons/links that don't go through <Button>. */
export const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Asterisk marker for required fields (decorative; pair with aria-required). */
export const requiredMark = <span className="text-destructive" aria-hidden="true"> *</span>;
