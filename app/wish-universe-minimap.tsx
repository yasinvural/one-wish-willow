"use client";

import type { Camera } from "@/lib/initial-viewport";
import type { PublicWish, PublicWishCluster } from "@/lib/wish-queries";
import {
  getMinimapPointFromWorldPoint,
  getMinimapViewportRect,
  getWorldPointFromMinimapPoint,
  type CanvasSize,
  type TransformState,
} from "@/lib/canvas-viewport";

const MINIMAP_SIZE = 176;
const minimapSize = { width: MINIMAP_SIZE, height: MINIMAP_SIZE };

type WishUniverseMinimapProps = {
  clusters: PublicWishCluster[];
  canvasSize: CanvasSize | null;
  transform: TransformState;
  selectedWish: PublicWish | null;
  onNavigate: (camera: Camera) => void;
};

export function WishUniverseMinimap({
  clusters,
  canvasSize,
  transform,
  selectedWish,
  onNavigate,
}: WishUniverseMinimapProps) {
  const viewport = canvasSize ? getMinimapViewportRect(transform, canvasSize, minimapSize) : null;
  const selectedWishPoint = selectedWish
    ? getMinimapPointFromWorldPoint({ x: selectedWish.x, y: selectedWish.y }, minimapSize)
    : null;

  return (
    <button
      type="button"
      aria-label="World minimap. Click to move the camera."
      className="canvas-control absolute right-5 bottom-5 z-20 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 p-2 shadow-2xl backdrop-blur-md sm:right-7 sm:bottom-7"
      style={{ width: MINIMAP_SIZE + 16, height: MINIMAP_SIZE + 16 }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onNavigate(
          getWorldPointFromMinimapPoint(
            { width: event.clientX - bounds.left - 8, height: event.clientY - bounds.top - 8 },
            minimapSize,
          ),
        );
      }}
    >
      <span className="pointer-events-none absolute top-2 left-3 z-10 text-[9px] font-semibold tracking-[0.14em] text-emerald-100/80 uppercase">
        World map
      </span>
      <span className="pointer-events-none absolute inset-2 overflow-hidden rounded-xl bg-slate-900/80">
        {clusters.map((cluster) => {
          const point = getMinimapPointFromWorldPoint(cluster, minimapSize);
          const dotSize = Math.min(10, 3 + Math.log2(cluster.count + 1) * 1.5);

          return (
            <span
              key={cluster.cell}
              className="absolute rounded-full bg-emerald-300/60"
              style={{
                left: point.x,
                top: point.y,
                width: dotSize,
                height: dotSize,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}

        {viewport && (
          <span
            className="absolute border border-emerald-100 bg-emerald-200/10"
            style={{
              left: viewport.x,
              top: viewport.y,
              width: Math.max(viewport.width, 2),
              height: Math.max(viewport.height, 2),
            }}
          />
        )}

        {selectedWishPoint && (
          <span
            aria-hidden="true"
            className="absolute size-2 rounded-full bg-amber-300 ring-2 ring-amber-100/80"
            style={{ left: selectedWishPoint.x, top: selectedWishPoint.y, transform: "translate(-50%, -50%)" }}
          />
        )}
      </span>
    </button>
  );
}
