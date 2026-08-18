import "server-only";

import { hashVisitorId } from "@/lib/visitor-identity";
import { prisma } from "@/lib/prisma";
import {
  MAX_VISIBLE_WISHES,
  shouldReturnClusters,
  type Viewport,
} from "@/lib/public-wishes";
import { getClusterCellCenter } from "@/lib/wish-location";

export type PublicWish = {
  id: string;
  text: string;
  x: number;
  y: number;
  clusterCell: string;
  createdAt: string;
};

export type PersonalWish = PublicWish & {
  isHidden: boolean;
};

export type PublicWishesResponse =
  | { type: "wishes"; wishes: PublicWish[] }
  | { type: "clusters"; clusters: Array<{ cell: string; count: number; x: number; y: number }> };

export type PublicWishCluster = {
  cell: string;
  count: number;
  x: number;
  y: number;
};

function serializeWish<T extends { createdAt: Date }>(wish: T): Omit<T, "createdAt"> & { createdAt: string } {
  const { createdAt, ...wishData } = wish;

  return {
    ...wishData,
    createdAt: createdAt.toISOString(),
  };
}

export async function getPersonalWish(visitorId: string): Promise<PersonalWish | null> {
  const wish = await prisma.wish.findUnique({
    where: { anonymousVisitorHash: hashVisitorId(visitorId) },
    select: {
      id: true,
      text: true,
      isHidden: true,
      x: true,
      y: true,
      clusterCell: true,
      createdAt: true,
    },
  });

  return wish ? serializeWish(wish) : null;
}

export async function getPublicWishes(viewport: Viewport): Promise<PublicWishesResponse> {
  const where = {
    isHidden: false,
    x: { gte: viewport.minX, lte: viewport.maxX },
    y: { gte: viewport.minY, lte: viewport.maxY },
  };

  if (!shouldReturnClusters(viewport)) {
    const wishes = await prisma.wish.findMany({
      where,
      orderBy: [{ x: "asc" }, { y: "asc" }, { createdAt: "asc" }],
      take: MAX_VISIBLE_WISHES + 1,
      select: {
        id: true,
        text: true,
        x: true,
        y: true,
        clusterCell: true,
        createdAt: true,
      },
    });

    if (wishes.length <= MAX_VISIBLE_WISHES) {
      return { type: "wishes", wishes: wishes.map(serializeWish) };
    }
  }

  const clusters = await prisma.wish.groupBy({
    by: ["clusterCell"],
    where,
    _count: { _all: true },
  });

  return {
    type: "clusters",
    clusters: clusters
      .map(({ clusterCell, _count }) => ({
        cell: clusterCell,
        count: _count._all,
        ...getClusterCellCenter(clusterCell),
      }))
      .sort((left, right) => left.cell.localeCompare(right.cell)),
  };
}

export async function getRecentPublicWishes(limit = 12): Promise<PublicWish[]> {
  const wishes = await prisma.wish.findMany({
    where: { isHidden: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      text: true,
      x: true,
      y: true,
      clusterCell: true,
      createdAt: true,
    },
  });

  return wishes.map(serializeWish);
}

export async function getPublicWishClusters(): Promise<PublicWishCluster[]> {
  const clusters = await prisma.wish.groupBy({
    by: ["clusterCell"],
    where: { isHidden: false },
    _count: { _all: true },
  });

  return clusters
    .map(({ clusterCell, _count }) => ({
      cell: clusterCell,
      count: _count._all,
      ...getClusterCellCenter(clusterCell),
    }))
    .sort((left, right) => left.cell.localeCompare(right.cell));
}
