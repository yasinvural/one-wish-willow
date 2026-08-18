"use client";

import type { Camera } from "@/lib/initial-viewport";
import type { PersonalWish, PublicWishesResponse } from "@/lib/wish-queries";

type WishUniverseProps = {
  camera: Camera;
  personalWish: PersonalWish | null;
  publicWishes: PublicWishesResponse | null;
  error: string | null;
};

export function WishUniverse({ camera, personalWish, publicWishes, error }: WishUniverseProps) {
  const visibleCount =
    publicWishes?.type === "wishes"
      ? publicWishes.wishes.length
      : publicWishes?.clusters.reduce((total, cluster) => total + cluster.count, 0);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b14] px-6 text-stone-100">
      <section className="max-w-xl space-y-5 text-center">
        <p className="text-sm tracking-[0.3em] text-emerald-300 uppercase">One Wish Willow</p>
        <h1 className="text-4xl font-semibold tracking-tight">The wishes are gathering.</h1>

        {personalWish ? (
          <p className="text-stone-300">Your wish rests here. The Willow has returned you to it.</p>
        ) : (
          <p className="text-stone-300">The Willow is waiting for its first wish from you.</p>
        )}

        {publicWishes && (
          <p className="text-sm text-stone-400">
            {visibleCount} {visibleCount === 1 ? "wish is" : "wishes are"} nearby.
          </p>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <p className="sr-only">Camera centered at {camera.x}, {camera.y}.</p>
      </section>
    </main>
  );
}
