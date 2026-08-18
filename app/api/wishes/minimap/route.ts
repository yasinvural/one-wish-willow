import { NextResponse } from "next/server";
import { getPublicWishClusters } from "@/lib/wish-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const clusters = await getPublicWishClusters();

  return NextResponse.json(clusters, { headers: { "Cache-Control": "no-store" } });
}
