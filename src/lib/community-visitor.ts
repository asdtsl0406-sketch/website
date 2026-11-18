export const COMMUNITY_VISITOR_COOKIE = "community_visitor";
export const COMMUNITY_VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VISITOR_ID_PATTERN = /^[a-f0-9]{64}$/;

export function createCommunityVisitorId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let id = "";
  for (const byte of bytes) id += byte.toString(16).padStart(2, "0");
  return id;
}

export function isCommunityVisitorId(value: unknown): value is string {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value);
}

export function buildCommunityVisitorCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: COMMUNITY_VISITOR_COOKIE_MAX_AGE,
  };
}
