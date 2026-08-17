import { randomInt } from "node:crypto";

const WORLD_SIZE = 1_000_000;
const CLUSTER_CELL_SIZE = 20_000;

export function createWishLocation() {
  const x = randomInt(WORLD_SIZE);
  const y = randomInt(WORLD_SIZE);

  return {
    x,
    y,
    clusterCell: `${Math.floor(x / CLUSTER_CELL_SIZE)}:${Math.floor(y / CLUSTER_CELL_SIZE)}`,
  };
}
