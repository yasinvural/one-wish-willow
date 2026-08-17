import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashVisitorId, VISITOR_COOKIE_NAME } from "@/lib/visitor-identity";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  if (!visitorId) {
    return NextResponse.json({ wish: null }, { headers: { "Cache-Control": "no-store" } });
  }

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

  return NextResponse.json({ wish }, { headers: { "Cache-Control": "no-store" } });
}
