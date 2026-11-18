export function normalizeSupabaseValue(value: string | undefined): string | undefined {
  // Values pasted from dashboards can contain line breaks, spaces, or invisible
  // Unicode characters. Supabase URLs and keys never contain them.
  return value?.replace(
    /[\u0000-\u0020\u007F-\u00A0\u00AD\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g,
    "",
  );
}

export function buildSupabaseHeaders(secretKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: secretKey,
    Accept: "application/json",
  };

  // Supabase's new sb_secret_/sb_publishable_ keys are opaque strings, not JWTs.
  // They must be sent on the apikey header only. Legacy service_role/anon keys
  // are JWTs and also need Authorization: Bearer to select the Postgres role.
  if (!secretKey.startsWith("sb_")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }

  return headers;
}
