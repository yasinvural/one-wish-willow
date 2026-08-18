"use client";

import { Clock3, Crosshair, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { WishComposer } from "@/app/wish-composer";
import type { PersonalWish, PublicWish } from "@/lib/wish-queries";

type WishUniverseControlsProps = {
  personalWish: PersonalWish | null;
  recentWishes: PublicWish[];
  visibleCount: number | undefined;
  isLoading: boolean;
  onFindPersonalWish: () => void;
  onWishCreated: (wish: PersonalWish) => void;
  onSelectRecentWish: (wish: PublicWish) => void;
  onZoom: (direction: -1 | 1) => void;
};

function relativeTime(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

export function WishUniverseControls({
  personalWish,
  recentWishes,
  visibleCount,
  isLoading,
  onFindPersonalWish,
  onWishCreated,
  onSelectRecentWish,
  onZoom,
}: WishUniverseControlsProps) {
  const [isRecentOpen, setIsRecentOpen] = useState(false);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5 sm:p-7">
        <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold tracking-[0.24em] text-emerald-300 uppercase">One Wish Willow</p>
          <p className="mt-1 text-xs text-stone-400">
            {isLoading ? "Listening for nearby wishes…" : `${visibleCount ?? 0} nearby wishes`}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {recentWishes.length > 0 && (
            <button
              type="button"
              aria-expanded={isRecentOpen}
              className="canvas-control inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-medium text-stone-100 shadow-xl backdrop-blur transition hover:bg-slate-800"
              onClick={() => setIsRecentOpen((isOpen) => !isOpen)}
            >
              <Clock3 className="size-4" aria-hidden="true" />
              Recent
            </button>
          )}

          {personalWish ? (
            <button
              type="button"
              className="canvas-control inline-flex items-center gap-2 rounded-xl border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-50 shadow-xl backdrop-blur transition hover:bg-emerald-200/20"
              onClick={onFindPersonalWish}
            >
              <Crosshair className="size-4" aria-hidden="true" />
              Find my wish
            </button>
          ) : (
            <WishComposer onWishCreated={onWishCreated} />
          )}
        </div>
      </header>

      {isRecentOpen && (
        <section className="absolute top-24 right-5 z-20 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-md sm:top-28 sm:right-7">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold tracking-[0.18em] text-emerald-300 uppercase">Recent wishes</p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {recentWishes.map((wish) => (
              <button
                key={wish.id}
                type="button"
                className="canvas-control w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.08]"
                onClick={() => {
                  setIsRecentOpen(false);
                  onSelectRecentWish(wish);
                }}
              >
                <span className="line-clamp-2 block text-sm leading-5 text-stone-100">{wish.text}</span>
                <span className="mt-1 block text-xs text-stone-500">{relativeTime(wish.createdAt)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="absolute bottom-5 left-5 z-20 flex gap-2 sm:bottom-7 sm:left-7">
        <button
          type="button"
          aria-label="Zoom out"
          className="canvas-control grid size-11 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-stone-100 shadow-xl backdrop-blur transition hover:bg-slate-800"
          onClick={() => onZoom(-1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className="canvas-control grid size-11 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-stone-100 shadow-xl backdrop-blur transition hover:bg-slate-800"
          onClick={() => onZoom(1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
