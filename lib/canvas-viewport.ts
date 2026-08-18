import type { Camera } from "@/lib/initial-viewport";
import { INITIAL_VIEWPORT_SIZE } from "@/lib/initial-viewport";
import type { Viewport } from "@/lib/public-wishes";
import { WORLD_SIZE } from "@/lib/world";

export const CANVAS_SIZE = 16_384;
export const WORLD_TO_CANVAS = CANVAS_SIZE / WORLD_SIZE;
export const MIN_ZOOM = 0.16;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.12;

export type CanvasSize = {
  width: number;
  height: number;
};

export type TransformState = {
  positionX: number;
  positionY: number;
  scale: number;
};

export type MinimapSize = {
  width: number;
  height: number;
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

export function getZoomedScale(scale: number, direction: -1 | 1) {
  return clamp(scale + direction * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
}

export function getTransformForCamera(camera: Camera, size: CanvasSize, scale: number): TransformState {
  return {
    positionX: size.width / 2 - camera.x * WORLD_TO_CANVAS * scale,
    positionY: size.height / 2 - camera.y * WORLD_TO_CANVAS * scale,
    scale,
  };
}

export function getMinimapPointFromWorldPoint(point: Camera, size: MinimapSize) {
  return {
    x: (point.x / WORLD_SIZE) * size.width,
    y: (point.y / WORLD_SIZE) * size.height,
  };
}

export function getWorldPointFromMinimapPoint(point: MinimapSize, size: MinimapSize): Camera {
  return {
    x: Math.round(clamp((point.width / size.width) * WORLD_SIZE, 0, WORLD_SIZE)),
    y: Math.round(clamp((point.height / size.height) * WORLD_SIZE, 0, WORLD_SIZE)),
  };
}

export function getMinimapViewportRect(
  transform: TransformState,
  canvasSize: CanvasSize,
  minimapSize: MinimapSize,
) {
  const viewport = getViewportFromTransform(transform, canvasSize);
  const topLeft = getMinimapPointFromWorldPoint({ x: viewport.minX, y: viewport.minY }, minimapSize);
  const bottomRight = getMinimapPointFromWorldPoint({ x: viewport.maxX, y: viewport.maxY }, minimapSize);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
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
