"use client";

import {
  type ReactZoomPanPinchContentRef,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { InfiniteCanvasSurface, WishUniverseCanvas } from "@/app/wish-universe-canvas";
import { WishUniverseControls } from "@/app/wish-universe-controls";
import { WishUniverseMinimap } from "@/app/wish-universe-minimap";
import { NeuralWillowBackground } from "@/app/neural-willow-background";
import type { Camera } from "@/lib/initial-viewport";
import type { PersonalWish, PublicWish, PublicWishCluster, PublicWishesResponse } from "@/lib/wish-queries";
import {
  getCameraFromTransform,
  getInitialZoom,
  getPannedTransform,
  getTransformForCamera,
  getViewportFromTransform,
  getZoomedScale,
  MAX_ZOOM,
  MIN_ZOOM,
  type CanvasSize,
  type TransformState,
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
          <WishUniverseCanvas
            publicWishes={publicWishes}
            personalWish={personalWish}
            selectedWish={selectedWish}
            onSelectWish={setSelectedWish}
            onSelectCluster={(cluster) =>
              moveCamera(
                { x: cluster.x, y: cluster.y },
                Math.min(Math.max(currentScale, DISCOVERY_ZOOM), MAX_ZOOM),
              )
            }
          />
        </TransformWrapper>
      </div>

      <WishUniverseControls
        personalWish={personalWish}
        recentWishes={recentWishes}
        visibleCount={visibleCount}
        isLoading={isLoading}
        onFindPersonalWish={() => personalWish && focusWish(personalWish)}
        onWishCreated={handleWishCreated}
        onSelectRecentWish={focusWish}
        onZoom={zoomAroundFocus}
      />

      <WishUniverseMinimap
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
