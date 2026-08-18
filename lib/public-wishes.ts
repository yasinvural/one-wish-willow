import { z } from "zod";
import { WORLD_SIZE } from "@/lib/world";

const coordinate = z.coerce.number().int().min(0).max(WORLD_SIZE);

export const MAX_VISIBLE_WISHES = 200;
export const CLUSTER_VIEWPORT_THRESHOLD = 160_000;

export const viewportSchema = z
  .object({
    minX: coordinate,
    maxX: coordinate,
    minY: coordinate,
    maxY: coordinate,
  })
  .superRefine(({ minX, maxX, minY, maxY }, context) => {
    if (minX >= maxX) {
      context.addIssue({
        code: "custom",
        message: "minX must be smaller than maxX.",
        path: ["minX"],
      });
    }

    if (minY >= maxY) {
      context.addIssue({
        code: "custom",
        message: "minY must be smaller than maxY.",
        path: ["minY"],
      });
    }
  });

export type Viewport = z.infer<typeof viewportSchema>;

export function shouldReturnClusters(viewport: Viewport) {
  const width = viewport.maxX - viewport.minX;
  const height = viewport.maxY - viewport.minY;

  return width >= CLUSTER_VIEWPORT_THRESHOLD || height >= CLUSTER_VIEWPORT_THRESHOLD;
}
