import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor-identity";
import { getPersonalWish } from "@/lib/wish-queries";

export async function GET() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

  if (!visitorId) {
    return NextResponse.json({ wish: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const wish = await getPersonalWish(visitorId);

  return NextResponse.json({ wish }, { headers: { "Cache-Control": "no-store" } });
}
