export const COMMUNITY_POST_RATE_LIMIT_WINDOW_MS = 60_000;
export const COMMUNITY_POST_RATE_LIMIT_MAX = 2;

const attemptsByClient = new Map<string, number[]>();

export type CommunityPostRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkCommunityPostRateLimit(
  clientKey: string,
  now = Date.now(),
): CommunityPostRateLimitResult {
  const recent = (attemptsByClient.get(clientKey) ?? []).filter(
    (attempt) => now - attempt < COMMUNITY_POST_RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= COMMUNITY_POST_RATE_LIMIT_MAX) {
    attemptsByClient.set(clientKey, recent);
    const oldest = recent[0] ?? now;
    const retryAfterMs = COMMUNITY_POST_RATE_LIMIT_WINDOW_MS - (now - oldest);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  attemptsByClient.set(clientKey, recent);

  if (attemptsByClient.size > 5000) {
    for (const [key, timestamps] of attemptsByClient) {
      if (timestamps.every((attempt) => now - attempt >= COMMUNITY_POST_RATE_LIMIT_WINDOW_MS)) {
        attemptsByClient.delete(key);
      }
    }
  }

  return { allowed: true };
}
