'use client';

import * as React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import type { DatasetImage } from '@/lib/types';

interface ImageGridProps {
  datasetId: string;
  images: DatasetImage[];
}

export function ImageGrid({ datasetId, images }: ImageGridProps) {
  if (!images.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No images yet. Upload some above.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Images <span className="ml-1 text-sm font-normal text-muted-foreground">({images.length})</span></h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images.map((img) => (
          <ImageCard key={img.id} datasetId={datasetId} image={img} />
        ))}
      </div>
    </section>
  );
}

function aspectRatio(width: number | null, height: number | null): string {
  if (width && height) return `${width} / ${height}`;
  return '1 / 1';
}

function ImageCard({ datasetId, image }: { datasetId: string; image: DatasetImage }) {
  const [err, setErr] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const annotatable = image.status === 'annotated' && image.annotationCount > 0;

  const inner = (
    <>
      <div
        className="relative w-full overflow-hidden bg-black/60"
        style={{ aspectRatio: aspectRatio(image.width, image.height) }}
      >
        {!err && image.downloadUrl ? (
          <img
            src={image.downloadUrl}
            alt={image.originalName}
            loading="lazy"
            className={`h-full w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <BrokenImgIcon />
          </div>
        )}

        <div className="absolute left-2 top-2">
          <StatusBadge status={image.status} />
        </div>

        {image.annotationCount > 0 && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <BoxesIcon />
            {image.annotationCount}
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-xs font-medium" title={image.originalName}>{image.originalName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {(Number(image.sizeBytes) / 1024).toFixed(0)} KB
        </p>
      </div>
    </>
  );

  const cardClass = `group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card ${
    annotatable ? 'transition-colors hover:border-primary/50' : 'cursor-default opacity-70'
  }`;

  if (annotatable) {
    return (
      <Link href={`/datasets/${datasetId}/review/${image.id}`} className={cardClass}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass} aria-disabled>{inner}</div>;
}

function BrokenImgIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 3l-6 6M9 3l6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BoxesIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" /></svg>;
}
