import type { Camera } from "@/lib/initial-viewport";
import { INITIAL_VIEWPORT_SIZE } from "@/lib/initial-viewport";
import type { Viewport } from "@/lib/public-wishes";
import { WORLD_SIZE } from "@/lib/world";

export const CANVAS_SIZE = 16_384;
export const WORLD_TO_CANVAS = CANVAS_SIZE / WORLD_SIZE;
export const MIN_ZOOM = 0.16;
export const MAX_ZOOM = 4;

export type CanvasSize = {
  width: number;
  height: number;
};

export type TransformState = {
  positionX: number;
  positionY: number;
  scale: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getInitialZoom(size: CanvasSize) {
  return clamp(
    Math.max(size.width, size.height) / (INITIAL_VIEWPORT_SIZE * WORLD_TO_CANVAS),
    MIN_ZOOM,
    MAX_ZOOM,
  );
}

export function getTransformForCamera(camera: Camera, size: CanvasSize, scale: number): TransformState {
  return {
    positionX: size.width / 2 - camera.x * WORLD_TO_CANVAS * scale,
    positionY: size.height / 2 - camera.y * WORLD_TO_CANVAS * scale,
    scale,
  };
}

export function getViewportFromTransform(transform: TransformState, size: CanvasSize): Viewport {
  const minX = clamp(
    Math.floor(-transform.positionX / (transform.scale * WORLD_TO_CANVAS)),
    0,
    WORLD_SIZE - 1,
  );
  const minY = clamp(
    Math.floor(-transform.positionY / (transform.scale * WORLD_TO_CANVAS)),
    0,
    WORLD_SIZE - 1,
  );
  const maxX = clamp(
    Math.ceil((size.width - transform.positionX) / (transform.scale * WORLD_TO_CANVAS)),
    minX + 1,
    WORLD_SIZE,
  );
  const maxY = clamp(
    Math.ceil((size.height - transform.positionY) / (transform.scale * WORLD_TO_CANVAS)),
    minY + 1,
    WORLD_SIZE,
  );

  return { minX, maxX, minY, maxY };
}

export function getCameraFromTransform(transform: TransformState, size: CanvasSize): Camera {
  const viewport = getViewportFromTransform(transform, size);

  return {
    x: Math.round((viewport.minX + viewport.maxX) / 2),
    y: Math.round((viewport.minY + viewport.maxY) / 2),
  };
}
