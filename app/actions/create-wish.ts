"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  createVisitorId,
  hashVisitorId,
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_COOKIE_NAME,
} from "@/lib/visitor-identity";
import { prisma } from "@/lib/prisma";
import { createWishLocation } from "@/lib/wish-location";

const createWishSchema = z.object({
  text: z.string().trim().min(1, "A wish cannot be empty.").max(280),
});

type WishResponse = {
  id: string;
  text: string;
  x: number;
  y: number;
  clusterCell: string;
  createdAt: Date;
};

export type CreateWishResult =
  | { status: "success"; wish: WishResponse }
  | { status: "error"; code: "INVALID_WISH" | "WISH_ALREADY_EXISTS"; message: string };

export async function createWish(formData: FormData): Promise<CreateWishResult> {
  const parsedWish = createWishSchema.safeParse({ text: formData.get("text") });

  if (!parsedWish.success) {
    return {
      status: "error",
      code: "INVALID_WISH",
      message: parsedWish.error.issues[0]?.message ?? "Please send a valid wish.",
    };
  }

  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  const visitorId = existingVisitorId ?? createVisitorId();
  const anonymousVisitorHash = hashVisitorId(visitorId);

  const existingWish = await prisma.wish.findUnique({
    where: { anonymousVisitorHash },
    select: { id: true },
  });

  if (existingWish) {
    return {
      status: "error",
      code: "WISH_ALREADY_EXISTS",
      message: "You have already made your one wish.",
    };
  }

  try {
    const location = createWishLocation();
    const wish = await prisma.wish.create({
      data: {
        text: parsedWish.data.text,
        anonymousVisitorHash,
        ...location,
      },
      select: {
        id: true,
        text: true,
        x: true,
        y: true,
        clusterCell: true,
        createdAt: true,
      },
    });

    if (!existingVisitorId) {
      cookieStore.set({
        name: VISITOR_COOKIE_NAME,
        value: visitorId,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
      });
    }

    return { status: "success", wish };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return {
        status: "error",
        code: "WISH_ALREADY_EXISTS",
        message: "You have already made your one wish.",
      };
    }

    throw error;
  }
}
