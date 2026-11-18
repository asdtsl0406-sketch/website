import { createHash } from "node:crypto";

// Only the hash is stored or logged. The raw visitor id stays in the browser cookie.
export function hashCommunityVisitorId(visitorId: string): string {
  return createHash("sha256").update(visitorId).digest("hex");
}
