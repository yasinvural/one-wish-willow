"use client";

import { Clock3, Crosshair, Minus, Plus, Sparkles } from "lucide-react";
import {
  type ReactZoomPanPinchContentRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { NeuralWillowBackground } from "@/app/neural-willow-background";
import { WishComposer } from "@/app/wish-composer";
import type { Camera } from "@/lib/initial-viewport";
import type { PersonalWish, PublicWish, PublicWishCluster, PublicWishesResponse } from "@/lib/wish-queries";
import {
  CANVAS_SIZE,
  getCameraFromTransform,
  getInitialZoom,
  getMinimapPointFromWorldPoint,
  getMinimapViewportRect,
  getPannedTransform,
  getTransformForCamera,
  getViewportFromTransform,
  getWorldPointFromMinimapPoint,
  getZoomedScale,
  MAX_ZOOM,
  MIN_ZOOM,
  type CanvasSize,
  type TransformState,
  WORLD_TO_CANVAS,
} from "@/lib/canvas-viewport";

type WishUniverseProps = {
  camera: Camera;
  personalWish: PersonalWish | null;
  publicWishes: PublicWishesResponse | null;
  recentWishes: PublicWish[];
  error: string | null;
};

type PanGesture = {
  pointerId: number;
  clientX: number;
  clientY: number;
  transform: TransformState;
};

const FETCH_DEBOUNCE_MS = 250;
const DISCOVERY_ZOOM = 1;
const MINIMAP_SIZE = 176;
const minimapSize = { width: MINIMAP_SIZE, height: MINIMAP_SIZE };

function Minimap({
  clusters,
  canvasSize,
  transform,
  selectedWish,
  onNavigate,
}: {
  clusters: PublicWishCluster[];
  canvasSize: CanvasSize | null;
  transform: TransformState;
  selectedWish: PublicWish | null;
  onNavigate: (camera: Camera) => void;
}) {
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

function InfiniteCanvasSurface({ transform }: { transform: TransformState }) {
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

export function WishUniverse({
  camera: initialCamera,
  personalWish: initialPersonalWish,
  publicWishes: initialWishes,
  recentWishes,
  error: initialError,
}: WishUniverseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const initializedRef = useRef(false);
  const suppressFetchRef = useRef(false);
  const canvasSizeRef = useRef<CanvasSize | null>(null);
  const panGestureRef = useRef<PanGesture | null>(null);

  const [camera, setCamera] = useState(initialCamera);
  const [personalWish, setPersonalWish] = useState(initialPersonalWish);
  const [publicWishes, setPublicWishes] = useState<PublicWishesResponse | null>(initialWishes);
  const [selectedWish, setSelectedWish] = useState<PublicWish | null>(null);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [currentScale, setCurrentScale] = useState(MIN_ZOOM);
  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);
  const [minimapClusters, setMinimapClusters] = useState<PublicWishCluster[]>([]);
  const [worldTransform, setWorldTransform] = useState<TransformState>({
    positionX: 0,
    positionY: 0,
    scale: MIN_ZOOM,
  });

  const fetchViewport = useCallback(async (transform: TransformState) => {
    const canvasSize = canvasSizeRef.current;
    if (!canvasSize) return;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    const viewport = getViewportFromTransform(transform, canvasSize);
    const query = new URLSearchParams(
      Object.entries(viewport).map(([key, value]) => [key, String(value)]),
    );

    try {
      const response = await fetch(`/api/wishes?${query}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("The Willow could not reveal this part of the world.");
      }

      const nextWishes = (await response.json()) as PublicWishesResponse;

      if (requestId === requestIdRef.current) {
        setPublicWishes(nextWishes);
        setError(null);
      }
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;

      if (requestId === requestIdRef.current) {
        setError("The Willow could not reveal this part of the world. Please try again.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const scheduleViewportFetch = useCallback(
    (transform: TransformState) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestControllerRef.current?.abort();

      debounceRef.current = setTimeout(() => {
        void fetchViewport(transform);
      }, FETCH_DEBOUNCE_MS);
    },
    [fetchViewport],
  );

  const moveCamera = useCallback((nextCamera: Camera, scale: number, animationTime = 350) => {
    const canvasSize = canvasSizeRef.current;
    const transform = transformRef.current;
    if (!canvasSize || !transform) return;

    const nextTransform = getTransformForCamera(nextCamera, canvasSize, scale);
    transform.setTransform(
      nextTransform.positionX,
      nextTransform.positionY,
      nextTransform.scale,
      animationTime,
    );
  }, []);

  const startPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === "mouse" && event.button !== 0) || !(event.target instanceof Element)) return;
    const transform = transformRef.current?.instance.state;
    if (event.target.closest(".wish-node, .canvas-control")) return;
    if (!transform) return;

    if (panGestureRef.current) {
      if (event.currentTarget.hasPointerCapture(panGestureRef.current.pointerId)) {
        event.currentTarget.releasePointerCapture(panGestureRef.current.pointerId);
      }
      panGestureRef.current = null;
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    panGestureRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      transform,
    };
    event.preventDefault();
  }, []);

  const continuePan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const panGesture = panGestureRef.current;
    const canvasSize = canvasSizeRef.current;
    const transform = transformRef.current;
    if (!panGesture || panGesture.pointerId !== event.pointerId || !canvasSize || !transform) return;

    const nextTransform = getPannedTransform(
      panGesture.transform,
      { x: event.clientX - panGesture.clientX, y: event.clientY - panGesture.clientY },
      canvasSize,
    );
    panGestureRef.current = {
      ...panGesture,
      clientX: event.clientX,
      clientY: event.clientY,
      transform: nextTransform,
    };
    transform.setTransform(nextTransform.positionX, nextTransform.positionY, nextTransform.scale, 0);
    event.preventDefault();
  }, []);

  const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (panGestureRef.current?.pointerId === event.pointerId) {
      panGestureRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateCanvasSize = () => {
      const size = { width: container.clientWidth, height: container.clientHeight };
      if (!size.width || !size.height) return;

      canvasSizeRef.current = size;
      setCanvasSize(size);

      if (!initializedRef.current && transformRef.current) {
        const scale = getInitialZoom(size);
        const transform = getTransformForCamera(initialCamera, size, scale);
        suppressFetchRef.current = true;
        transformRef.current.setTransform(transform.positionX, transform.positionY, transform.scale, 0);
        setCurrentScale(transform.scale);
        setWorldTransform(transform);
        initializedRef.current = true;
        requestAnimationFrame(() => {
          suppressFetchRef.current = false;
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);
    updateCanvasSize();

    return () => resizeObserver.disconnect();
  }, [initialCamera]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/wishes/minimap", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load minimap data.");
        return (await response.json()) as PublicWishCluster[];
      })
      .then(setMinimapClusters)
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError("The Willow could not reveal the world map. Please try again.");
        }
      });

    return () => controller.abort();
  }, []);

  const handleTransform = useCallback(
    (_ref: unknown, nextTransform: TransformState) => {
      const canvasSize = canvasSizeRef.current;
      if (!canvasSize) return;

      setCamera(getCameraFromTransform(nextTransform, canvasSize));
      setCurrentScale(nextTransform.scale);
      setWorldTransform(nextTransform);

      if (!initializedRef.current || suppressFetchRef.current) return;
      scheduleViewportFetch(nextTransform);
    },
    [scheduleViewportFetch],
  );

  const visibleCount =
    publicWishes?.type === "wishes"
      ? publicWishes.wishes.length
      : publicWishes?.clusters.reduce((total, cluster) => total + cluster.count, 0);

  const handleWishCreated = useCallback(
    (wish: PersonalWish) => {
      setPersonalWish(wish);
      setSelectedWish(wish);
      setError(null);
      moveCamera({ x: wish.x, y: wish.y }, Math.max(currentScale, 1));
    },
    [currentScale, moveCamera],
  );

  const focusWish = useCallback(
    (wish: PublicWish) => {
      setSelectedWish(wish);
      moveCamera({ x: wish.x, y: wish.y }, Math.max(currentScale, DISCOVERY_ZOOM));
    },
    [currentScale, moveCamera],
  );

  const zoomAroundFocus = useCallback(
    (direction: -1 | 1) => {
      const focus = selectedWish ? { x: selectedWish.x, y: selectedWish.y } : camera;
      moveCamera(focus, getZoomedScale(currentScale, direction), 250);
    },
    [camera, currentScale, moveCamera, selectedWish],
  );

  const selectedWishIsLoaded =
    publicWishes?.type === "wishes" && publicWishes.wishes.some((wish) => wish.id === selectedWish?.id);
  const shouldRenderSelectedWish =
    selectedWish !== null && !selectedWishIsLoaded && !(personalWish?.id === selectedWish.id && personalWish.isHidden);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060912] text-stone-100">
      <NeuralWillowBackground />
      <InfiniteCanvasSurface transform={worldTransform} />

      <div
        ref={containerRef}
        className="absolute inset-0 z-10 touch-none"
        onPointerDown={startPan}
        onPointerMove={continuePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <TransformWrapper
          ref={transformRef}
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          limitToBounds
          centerOnInit={false}
          smooth={false}
          wheel={{ step: 0.08 }}
          doubleClick={{ disabled: true }}
          panning={{
            disabled: true,
            allowLeftClickPan: false,
            allowMiddleClickPan: false,
            allowRightClickPan: false,
          }}
          onTransform={handleTransform}
        >
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-auto !w-auto">
            <div
              className="relative"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            >
              {publicWishes?.type === "wishes" &&
                publicWishes.wishes.map((wish) => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    selected={selectedWish?.id === wish.id}
                    onSelect={() => setSelectedWish(wish)}
                  />
                ))}

              {shouldRenderSelectedWish && selectedWish && (
                <WishCard
                  wish={selectedWish}
                  selected
                  onSelect={() => setSelectedWish(selectedWish)}
                />
              )}

              {publicWishes?.type === "clusters" &&
                publicWishes.clusters.map((cluster) => (
                  <ClusterNode
                    key={cluster.cell}
                    {...cluster}
                    selected={selectedWish?.clusterCell === cluster.cell}
                    onClick={() =>
                      moveCamera(
                        { x: cluster.x, y: cluster.y },
                        Math.min(Math.max(currentScale, DISCOVERY_ZOOM), MAX_ZOOM),
                      )
                    }
                  />
                ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

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
              onClick={() => focusWish(personalWish)}
            >
              <Crosshair className="size-4" aria-hidden="true" />
              Find my wish
            </button>
          ) : (
            <WishComposer onWishCreated={handleWishCreated} />
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
                  focusWish(wish);
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
          onClick={() => zoomAroundFocus(-1)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className="canvas-control grid size-11 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-stone-100 shadow-xl backdrop-blur transition hover:bg-slate-800"
          onClick={() => zoomAroundFocus(1)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Minimap
        clusters={minimapClusters}
        canvasSize={canvasSize}
        transform={worldTransform}
        selectedWish={selectedWish}
        onNavigate={(nextCamera) => moveCamera(nextCamera, currentScale)}
      />

      {error && (
        <p className="absolute right-5 bottom-5 z-20 max-w-xs rounded-xl border border-rose-300/20 bg-rose-950/60 px-4 py-3 text-sm text-rose-100 shadow-xl backdrop-blur sm:right-7 sm:bottom-7">
          {error}
        </p>
      )}

      <p className="sr-only">Camera centered at {camera.x}, {camera.y}.</p>
    </main>
  );
}
