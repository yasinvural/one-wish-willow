import { cookies } from "next/headers";
import { WishUniverse } from "@/app/wish-universe";
import { createInitialViewport, type Camera } from "@/lib/initial-viewport";
import {
  getPersonalWish,
  getPublicWishes,
  getRecentPublicWishes,
  type PersonalWish,
  type PublicWish,
  type PublicWishesResponse,
} from "@/lib/wish-queries";
import { VISITOR_COOKIE_NAME } from "@/lib/visitor-identity";
import { WORLD_SIZE } from "@/lib/world";

const DEFAULT_CAMERA: Camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };

export default async function Home() {
  let personalWish: PersonalWish | null = null;
  let publicWishes: PublicWishesResponse | null = null;
  let recentWishes: PublicWish[] = [];
  let error: string | null = null;

  try {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;

    if (visitorId) {
      personalWish = await getPersonalWish(visitorId);
    }

    recentWishes = await getRecentPublicWishes();
    const camera = personalWish
      ? { x: personalWish.x, y: personalWish.y }
      : recentWishes[0]
        ? { x: recentWishes[0].x, y: recentWishes[0].y }
        : DEFAULT_CAMERA;
    publicWishes = await getPublicWishes(createInitialViewport(camera));

    return (
      <WishUniverse
        camera={camera}
        personalWish={personalWish}
        publicWishes={publicWishes}
        recentWishes={recentWishes}
        error={error}
      />
    );
  } catch {
    error = "The Willow could not reveal its wishes. Please try again.";

    return (
      <WishUniverse
        camera={DEFAULT_CAMERA}
        personalWish={personalWish}
        publicWishes={publicWishes}
        recentWishes={recentWishes}
        error={error}
      />
    );
  }
}
