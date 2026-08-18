import { NextRequest, NextResponse } from "next/server";
import { viewportSchema } from "@/lib/public-wishes";
import { getPublicWishes } from "@/lib/wish-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsedViewport = viewportSchema.safeParse({
    minX: request.nextUrl.searchParams.get("minX"),
    maxX: request.nextUrl.searchParams.get("maxX"),
    minY: request.nextUrl.searchParams.get("minY"),
    maxY: request.nextUrl.searchParams.get("maxY"),
  });

  if (!parsedViewport.success) {
    return NextResponse.json(
      { error: parsedViewport.error.issues[0]?.message ?? "Please provide valid viewport bounds." },
      { status: 400 },
    );
  }

  const publicWishes = await getPublicWishes(parsedViewport.data);

  return NextResponse.json(publicWishes, { headers: { "Cache-Control": "no-store" } });
}
