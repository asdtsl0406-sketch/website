import { NextResponse, type NextRequest } from "next/server";
import {
  COMMUNITY_VISITOR_COOKIE,
  buildCommunityVisitorCookieOptions,
  createCommunityVisitorId,
  isCommunityVisitorId,
} from "@/lib/community-visitor";

// Issues the anonymous browser identity used for votes and post ownership.
// The value is random, HttpOnly, and never leaves the server except in the cookie.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const current = request.cookies.get(COMMUNITY_VISITOR_COOKIE)?.value;

  if (!isCommunityVisitorId(current)) {
    response.cookies.set(
      COMMUNITY_VISITOR_COOKIE,
      createCommunityVisitorId(),
      buildCommunityVisitorCookieOptions(process.env.NODE_ENV === "production"),
    );
  }

  return response;
}

export const config = {
  matcher: ["/community", "/community/:path*", "/api/community/:path*"],
};
