import { createHmac, randomBytes } from "node:crypto";

export const VISITOR_COOKIE_NAME = "one-wish-willow-visitor";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getVisitorHashSecret() {
  const secret = process.env.VISITOR_HASH_SECRET;

  if (!secret) {
    throw new Error("VISITOR_HASH_SECRET is not configured.");
  }

  return secret;
}

export function createVisitorId() {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorId(visitorId: string) {
  return createHmac("sha256", getVisitorHashSecret())
    .update(visitorId)
    .digest("base64url");
}
