import { randomInt } from "node:crypto";
import { CLUSTER_CELL_SIZE, WORLD_SIZE } from "@/lib/world";

export function getClusterCell(x: number, y: number) {
  return `${Math.floor(x / CLUSTER_CELL_SIZE)}:${Math.floor(y / CLUSTER_CELL_SIZE)}`;
}

export function getClusterCellCenter(clusterCell: string) {
  const [xCell, yCell] = clusterCell.split(":").map(Number);

  return {
    x: xCell * CLUSTER_CELL_SIZE + CLUSTER_CELL_SIZE / 2,
    y: yCell * CLUSTER_CELL_SIZE + CLUSTER_CELL_SIZE / 2,
  };
}

export function createWishLocation() {
  const x = randomInt(WORLD_SIZE);
  const y = randomInt(WORLD_SIZE);

  return {
    x,
    y,
    clusterCell: getClusterCell(x, y),
  };
}
