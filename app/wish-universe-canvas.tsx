"use client";

import { Sparkles } from "lucide-react";
import { TransformComponent } from "react-zoom-pan-pinch";
import type { PersonalWish, PublicWish, PublicWishesResponse } from "@/lib/wish-queries";
import { CANVAS_SIZE, type TransformState, WORLD_TO_CANVAS } from "@/lib/canvas-viewport";

type WishUniverseCanvasProps = {
  publicWishes: PublicWishesResponse | null;
  personalWish: PersonalWish | null;
  selectedWish: PublicWish | null;
  onSelectWish: (wish: PublicWish) => void;
  onSelectCluster: (cluster: { x: number; y: number }) => void;
};

export function InfiniteCanvasSurface({ transform }: { transform: TransformState }) {
  const gridSize = Math.max(2, 28 * transform.scale);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(167, 243, 208, 0.18) 1px, transparent 0)",
          backgroundPosition: `${transform.positionX}px ${transform.positionY}px`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(2,6,23,0.74)_100%)]" />
    </div>
  );
}

function relativeTime(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function WishCard({
  wish,
  selected,
  onSelect,
}: {
  wish: PublicWish;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`wish-node absolute w-52 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-4 py-3 text-left shadow-2xl backdrop-blur transition ${
        selected
          ? "border-emerald-200 bg-emerald-100/20 ring-2 ring-emerald-300/60"
          : "border-white/15 bg-slate-950/75 hover:border-emerald-200/60 hover:bg-slate-900/85"
      }`}
      style={{ left: wish.x * WORLD_TO_CANVAS, top: wish.y * WORLD_TO_CANVAS }}
    >
      <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-emerald-300 uppercase">
        <Sparkles className="size-3" aria-hidden="true" /> Wish
      </span>
      <span className="line-clamp-3 block text-sm leading-5 text-stone-100">{wish.text}</span>
      <span className="mt-2 block text-xs text-stone-400">{relativeTime(wish.createdAt)}</span>
    </button>
  );
}

function ClusterNode({
  cell,
  count,
  x,
  y,
  selected,
  onClick,
}: {
  cell: string;
  count: number;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${selected ? "Selected " : ""}Explore ${count} wishes in cluster ${cell}`}
      onClick={onClick}
      className={`wish-node absolute flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-emerald-100 shadow-[0_0_48px_rgba(110,231,183,0.3)] backdrop-blur transition hover:scale-110 hover:bg-emerald-200/20 ${
        selected
          ? "border-emerald-100 bg-emerald-200/30 ring-4 ring-emerald-300/50"
          : "border-emerald-200/40 bg-emerald-300/10"
      }`}
      style={{ left: x * WORLD_TO_CANVAS, top: y * WORLD_TO_CANVAS }}
    >
      <span className="text-lg font-semibold tabular-nums">{count}</span>
      <span className="text-[9px] font-semibold tracking-[0.14em] uppercase">wishes</span>
    </button>
  );
}

export function WishUniverseCanvas({
  publicWishes,
  personalWish,
  selectedWish,
  onSelectWish,
  onSelectCluster,
}: WishUniverseCanvasProps) {
  const selectedWishIsLoaded =
    publicWishes?.type === "wishes" && publicWishes.wishes.some((wish) => wish.id === selectedWish?.id);
  const shouldRenderSelectedWish =
    selectedWish !== null && !selectedWishIsLoaded && !(personalWish?.id === selectedWish.id && personalWish.isHidden);

  return (
    <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-auto !w-auto">
      <div className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
        {publicWishes?.type === "wishes" &&
          publicWishes.wishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              selected={selectedWish?.id === wish.id}
              onSelect={() => onSelectWish(wish)}
            />
          ))}

        {shouldRenderSelectedWish && selectedWish && (
          <WishCard wish={selectedWish} selected onSelect={() => onSelectWish(selectedWish)} />
        )}

        {publicWishes?.type === "clusters" &&
          publicWishes.clusters.map((cluster) => (
            <ClusterNode
              key={cluster.cell}
              {...cluster}
              selected={selectedWish?.clusterCell === cluster.cell}
              onClick={() => onSelectCluster(cluster)}
            />
          ))}
      </div>
    </TransformComponent>
  );
}
