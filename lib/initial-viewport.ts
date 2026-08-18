import { WORLD_SIZE } from "@/lib/world";

export const INITIAL_VIEWPORT_SIZE = 120_000;

export type Camera = {
  x: number;
  y: number;
};

export function createInitialViewport(camera: Camera) {
  const maxOrigin = WORLD_SIZE - INITIAL_VIEWPORT_SIZE;
  const minX = Math.min(Math.max(camera.x - INITIAL_VIEWPORT_SIZE / 2, 0), maxOrigin);
  const minY = Math.min(Math.max(camera.y - INITIAL_VIEWPORT_SIZE / 2, 0), maxOrigin);

  return {
    minX,
    maxX: minX + INITIAL_VIEWPORT_SIZE,
    minY,
    maxY: minY + INITIAL_VIEWPORT_SIZE,
  };
}
