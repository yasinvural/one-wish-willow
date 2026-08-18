"use client";

import { Sparkles, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { createWish } from "@/app/actions/create-wish";
import type { PersonalWish } from "@/lib/wish-queries";

type WishComposerProps = {
  onWishCreated: (wish: PersonalWish) => void;
};

export function WishComposer({ onWishCreated }: WishComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = useCallback(() => {
    if (isPending) return;

    setIsOpen(false);
    setFeedback(null);
  }, [isPending]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await createWish(formData);

        if (result.status === "error") {
          setFeedback(result.message);
          return;
        }

        onWishCreated({
          ...result.wish,
          createdAt: result.wish.createdAt.toISOString(),
          isHidden: false,
        });
        setText("");
        setIsOpen(false);
      } catch {
        setFeedback("The Willow could not receive your wish. Please try again.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="canvas-control pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-emerald-200/30 bg-emerald-300/15 px-3 py-2 text-sm font-medium text-emerald-50 shadow-xl backdrop-blur transition hover:bg-emerald-200/25"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Make a wish
      </button>

      {isOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-slate-950/70 p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            aria-describedby="wish-description"
            aria-labelledby="wish-title"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-emerald-100/15 bg-slate-950/95 p-6 shadow-2xl shadow-black/50 sm:p-7"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-emerald-300 uppercase">One Wish Willow</p>
                <h2 id="wish-title" className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">
                  Make your one wish
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close wish dialog"
                className="grid size-9 place-items-center rounded-lg text-stone-400 transition hover:bg-white/10 hover:text-stone-100 disabled:cursor-not-allowed"
                disabled={isPending}
                onClick={close}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <p id="wish-description" className="mt-3 text-sm leading-6 text-stone-400">
              Choose carefully. The Willow accepts one wish from each visitor.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="wish-text">
                Your wish
              </label>
              <textarea
                autoFocus
                id="wish-text"
                name="text"
                maxLength={280}
                placeholder="I wish…"
                required
                rows={5}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-base leading-6 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/15"
              />

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs tabular-nums text-stone-500">{text.length}/280</p>
                <button
                  type="submit"
                  disabled={isPending || !text.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  {isPending ? "Sending…" : "Offer wish"}
                </button>
              </div>

              {feedback && <p className="rounded-xl border border-rose-300/20 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{feedback}</p>}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
