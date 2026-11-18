// State-changing community requests must come from this site. Browsers always send
// Origin on cross-site POST/DELETE, so a missing header means a non-browser client.
export function isSameOriginRequest(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
