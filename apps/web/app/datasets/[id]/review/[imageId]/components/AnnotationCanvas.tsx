'use client';

import * as React from 'react';
import type { Annotation, DatasetImage } from '@/lib/types';
import { labelColor, labelFill, polygonPath, formatPercent } from '@/lib/utils';

interface AnnotationCanvasProps {
  image: DatasetImage;
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBboxChange: (id: string, bbox: { x: number; y: number; width: number; height: number }) => void;
}

type Drag =
  | { kind: 'move'; id: string; grabX: number; grabY: number; start: { x: number; y: number; width: number; height: number } }
  | { kind: 'resize'; id: string; corner: 'tl' | 'tr' | 'bl' | 'br'; anchor: { x: number; y: number }; start: { x: number; y: number; width: number; height: number } };

export function AnnotationCanvas({ image, annotations, selectedId, onSelect, onBboxChange }: AnnotationCanvasProps) {
  const [dims, setDims] = React.useState<{ width: number; height: number } | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [box, setBox] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [container, setContainer] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Resolve true pixel size once for the loaded image so bbox scale is correct.
  React.useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.src = image.downloadUrl ?? '';
    const ok = () => { if (!cancelled) setDims({ width: img.naturalWidth || image.width || 0, height: img.naturalHeight || image.height || 0 }); };
    const fail = () => { if (!cancelled && image.width && image.height) setDims({ width: image.width, height: image.height }); };
    img.onload = ok;
    img.onerror = fail;
    return () => { cancelled = true; };
  }, [image.downloadUrl, image.id, image.width, image.height]);

  // Track container size so the image + overlay scale down cleanly.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setContainer({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = dims?.width ?? 0;
  const h = dims?.height ?? 0;

  // Letterbox "contain" fit: compute where the image should render inside the container.
  React.useEffect(() => {
    if (!w || !h || !container.w || !container.h) { setBox(null); return; }
    const scale = Math.min(container.w / w, container.h / h);
    const width = w * scale;
    const height = h * scale;
    setBox({ x: (container.w - width) / 2, y: (container.h - height) / 2, width, height });
  }, [w, h, container.w, container.h]);

  function clientToOrig(clientX: number, clientY: number): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height || !w || !h) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * w, y: ((clientY - rect.top) / rect.height) * h };
  }

  function startMove(e: React.PointerEvent, ann: Annotation) {
    if (!ann.bbox) return;
    e.stopPropagation();
    e.preventDefault();
    const p = clientToOrig(e.clientX, e.clientY);
    setDrag({ kind: 'move', id: ann.id, grabX: p.x, grabY: p.y, start: { ...ann.bbox } });
  }

  function startResize(e: React.PointerEvent, ann: Annotation, corner: 'tl' | 'tr' | 'bl' | 'br') {
    if (!ann.bbox) return;
    e.stopPropagation();
    e.preventDefault();
    const b = ann.bbox;
    const corners = {
      tl: { x: b.x, y: b.y },
      tr: { x: b.x + b.width, y: b.y },
      bl: { x: b.x, y: b.y + b.height },
      br: { x: b.x + b.width, y: b.y + b.height },
    };
    setDrag({ kind: 'resize', id: ann.id, corner, anchor: corners[corner], start: { ...b } });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const p = clientToOrig(e.clientX, e.clientY);
    if (drag.kind === 'move') {
      const dx = p.x - drag.grabX;
      const dy = p.y - drag.grabY;
      const s = drag.start;
      onBboxChange(drag.id, {
        x: Math.max(0, Math.round(s.x + dx)),
        y: Math.max(0, Math.round(s.y + dy)),
        width: s.width,
        height: s.height,
      });
    } else {
      const a = drag.anchor;
      onBboxChange(drag.id, {
        x: Math.min(a.x, Math.round(p.x)),
        y: Math.min(a.y, Math.round(p.y)),
        width: Math.max(1, Math.abs(p.x - a.x)),
        height: Math.max(1, Math.abs(p.y - a.y)),
      });
    }
  }

  function endDrag() { setDrag(null); }

  const hovered = annotations.find((a) => a.id === hoverId);
  const selected = annotations.find((a) => a.id === selectedId);
  const ready = !!(w && h && box && box.width > 0);

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[520px] w-full overflow-hidden rounded-xl border border-border bg-neutral-950"
      style={{ touchAction: drag ? 'none' : 'auto' }}
    >
      <div className="absolute inset-3 flex items-center justify-center">
        <div className="relative" style={ready ? { width: box.width, height: box.height } : undefined}>
          {image.downloadUrl ? (
            <img
              src={image.downloadUrl}
              alt={image.originalName}
              draggable={false}
              className="select-none"
              style={{ width: ready ? box.width : '100%', height: ready ? box.height : 480, objectFit: 'fill' }}
            />
          ) : (
            <div className="flex h-96 w-96 items-center justify-center rounded border border-dashed border-border text-sm text-muted-foreground">
              No image preview available.
            </div>
          )}
        </div>
      </div>

      {ready && (
        <svg
          ref={svgRef}
          className="absolute"
          width={box.width}
          height={box.height}
          style={{ left: 12 + box.x, top: 12 + box.y, pointerEvents: 'auto', cursor: drag ? 'grabbing' : 'default' }}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {annotations.map((a) => {
            const color = labelColor(a.label);
            const isSel = a.id === selectedId;
            const isHover = a.id === hoverId;
            const opacity = isSel ? 1 : isHover ? 0.95 : 0.8;
            if (a.bbox) {
              const b = a.bbox;
              return (
                <rect
                  key={a.id}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={b.height}
                  fill={labelFill(a.label)}
                  stroke={color}
                  strokeWidth={isSel ? 3 : 2}
                  opacity={opacity}
                  style={{ cursor: 'move' }}
                  onPointerDown={(e) => { startMove(e, a); onSelect(a.id); }}
                  onPointerEnter={() => setHoverId(a.id)}
                  onPointerLeave={() => setHoverId(null)}
                />
              );
            }
            if (a.polygon && a.polygon.length) {
              return (
                <polygon
                  key={a.id}
                  points={polygonPath(a.polygon)}
                  fill={labelFill(a.label)}
                  stroke={color}
                  strokeWidth={isSel ? 3 : 2}
                  opacity={opacity}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => { e.stopPropagation(); onSelect(a.id); }}
                  onPointerEnter={() => setHoverId(a.id)}
                  onPointerLeave={() => setHoverId(null)}
                />
              );
            }
            return null;
          })}

          {selected?.bbox && (() => {
            const b = selected.bbox;
            const hs = Math.max(12, Math.max(w, h) / 150);
            const handle = (cx: number, cy: number, corner: 'tl' | 'tr' | 'bl' | 'br') => (
              <rect
                key={corner}
                x={cx - hs / 2}
                y={cy - hs / 2}
                width={hs}
                height={hs}
                fill="#fff"
                stroke={labelColor(selected.label)}
                strokeWidth={2}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => startResize(e, selected, corner)}
              />
            );
            return (
              <>
                {handle(b.x, b.y, 'tl')}
                {handle(b.x + b.width, b.y, 'tr')}
                {handle(b.x, b.y + b.height, 'bl')}
                {handle(b.x + b.width, b.y + b.height, 'br')}
              </>
            );
          })()}
        </svg>
      )}

      {(() => {
        const tip = hovered ?? selected;
        if (!tip || !ready) return null;
        return (
          <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-lg">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: labelColor(tip.label) }} />
            <span className="font-semibold">{tip.label}</span>
            <span className="text-muted-foreground">{formatPercent(tip.confidence)}</span>
            {tip.isCorrected && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-amber-300">Corrected</span>
            )}
          </div>
        );
      })()}

      {ready && annotations.length > 0 && (
        <p className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] text-slate-300 backdrop-blur-sm">
          Drag a box to move it · drag corners to resize · click to select
        </p>
      )}
    </div>
  );
}
