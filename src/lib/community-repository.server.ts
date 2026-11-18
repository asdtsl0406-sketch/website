import {
  buildCommunityPostDetailSearchParams,
  buildCommunityPostListSearchParams,
  filterVisibleCommunityPosts,
  type CommunityPost,
  type CommunityPostInput,
} from "./community-posts";
import { buildSupabaseHeaders, normalizeSupabaseValue } from "./supabase-headers";
import {
  classifySupabaseFetchFailure,
  type SupabaseNetworkReason,
} from "./supabase-failure";

type SupabaseConfig = {
  url: string;
  secretKey: string;
};

type CommunityStoreFailure = {
  ok: false;
  reason: "not_configured" | "unavailable" | "network";
  status?: number;
  code?: string;
  networkReason?: SupabaseNetworkReason;
};

export type CommunityPostListResult =
  | { ok: true; posts: CommunityPost[] }
  | CommunityStoreFailure;

export type CommunityPostDetailResult =
  | { ok: true; post: CommunityPost | null }
  | CommunityStoreFailure;

export type CommunityPostCreateResult =
  | { ok: true }
  | CommunityStoreFailure;

function redactSecret(value: string, secretKey: string): string {
  return secretKey ? value.split(secretKey).join("[redacted]") : value;
}

function getSupabaseConfig(): SupabaseConfig | null {
  // Environment values pasted from dashboards can contain line breaks or spaces.
  // Supabase URLs and keys never contain whitespace, so remove all of it.
  const url = normalizeSupabaseValue(process.env.SUPABASE_URL);
  const secretKey = normalizeSupabaseValue(process.env.SUPABASE_SECRET_KEY);

  if (!url || !secretKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { url: url.replace(/\/+$/, ""), secretKey };
}

async function readJsonRows(response: Response): Promise<unknown[]> {
  try {
    const data: unknown = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type PostgrestErrorDetails = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

async function logSupabaseFailure(
  operation: string,
  response: Response,
  secretKey: string,
): Promise<PostgrestErrorDetails> {
  const details: PostgrestErrorDetails = {};

  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      if (typeof record.code === "string") details.code = redactSecret(record.code, secretKey);
      if (typeof record.message === "string") details.message = redactSecret(record.message, secretKey);
      if (typeof record.details === "string") details.details = redactSecret(record.details, secretKey);
      if (typeof record.hint === "string") details.hint = redactSecret(record.hint, secretKey);
    }
  } catch {
    // The response body is not required for diagnostics.
  }

  console.error("[community] Supabase request failed", {
    operation,
    status: response.status,
    code: details.code,
    message: details.message,
    details: details.details,
    hint: details.hint,
  });

  return details;
}

function logFetchFailure(
  operation: string,
  error: unknown,
  secretKey: string,
): SupabaseNetworkReason {
  const info: Record<string, unknown> = { operation };

  if (error instanceof Error) {
    info.error = error.name;
    info.message = redactSecret(error.message, secretKey);

    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      info.cause = cause.name;
      info.causeMessage = redactSecret(cause.message, secretKey);
      const code = (cause as Error & { code?: unknown }).code;
      if (typeof code === "string") info.causeCode = code;
    }
  } else {
    info.error = "unknown";
  }

  const networkReason = classifySupabaseFetchFailure(error);
  info.networkReason = networkReason;
  console.error("[community] Supabase request failed", info);

  return networkReason;
}

export async function listPublicCommunityPosts(): Promise<CommunityPostListResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const params = buildCommunityPostListSearchParams();
    const response = await fetch(`${config.url}/rest/v1/posts?${params.toString()}`, {
      headers: buildSupabaseHeaders(config.secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure("list posts", response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    return { ok: true, posts: filterVisibleCommunityPosts(await readJsonRows(response)) };
  } catch (error) {
    const networkReason = logFetchFailure("list posts", error, config.secretKey);
    return { ok: false, reason: "network", networkReason };
  }
}

export async function getPublicCommunityPost(id: string): Promise<CommunityPostDetailResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const params = buildCommunityPostDetailSearchParams(id);
    const response = await fetch(`${config.url}/rest/v1/posts?${params.toString()}`, {
      headers: buildSupabaseHeaders(config.secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure("get post", response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    const [post] = filterVisibleCommunityPosts(await readJsonRows(response));
    return { ok: true, post: post ?? null };
  } catch (error) {
    const networkReason = logFetchFailure("get post", error, config.secretKey);
    return { ok: false, reason: "network", networkReason };
  }
}

export async function createCommunityPost(input: CommunityPostInput): Promise<CommunityPostCreateResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const response = await fetch(`${config.url}/rest/v1/posts`, {
      method: "POST",
      headers: {
        ...buildSupabaseHeaders(config.secretKey),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        board: input.board,
        title: input.title,
        body: input.body,
        is_hidden: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure("create post", response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    // A 2xx response means Supabase stored the row. The response body is optional
    // here because the list refreshes from the database after a successful save.
    await readJsonRows(response);
    return { ok: true };
  } catch (error) {
    const networkReason = logFetchFailure("create post", error, config.secretKey);
    return { ok: false, reason: "network", networkReason };
  }
}
