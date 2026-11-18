import {
  buildCommunityPostDetailSearchParams,
  buildCommunityPostListSearchParams,
  filterVisibleCommunityPosts,
  type CommunityPost,
  type CommunityPostInput,
} from "./community-posts";

type SupabaseConfig = {
  url: string;
  secretKey: string;
};

type CommunityStoreFailure = {
  ok: false;
  reason: "not_configured" | "unavailable";
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

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { url: url.replace(/\/+$/, ""), secretKey };
}

function getHeaders(config: SupabaseConfig): HeadersInit {
  return {
    apikey: config.secretKey,
    Authorization: `Bearer ${config.secretKey}`,
    Accept: "application/json",
  };
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

async function logSupabaseFailure(operation: string, response: Response): Promise<void> {
  const details: PostgrestErrorDetails = {};

  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const record = body as Record<string, unknown>;
      if (typeof record.code === "string") details.code = record.code;
      if (typeof record.message === "string") details.message = record.message;
      if (typeof record.details === "string") details.details = record.details;
      if (typeof record.hint === "string") details.hint = record.hint;
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
}

function logFetchFailure(operation: string, error: unknown): void {
  console.error("[community] Supabase request failed", {
    operation,
    error: error instanceof Error ? error.name : "unknown",
  });
}

export async function listPublicCommunityPosts(): Promise<CommunityPostListResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const params = buildCommunityPostListSearchParams();
    const response = await fetch(`${config.url}/rest/v1/posts?${params.toString()}`, {
      headers: getHeaders(config),
      cache: "no-store",
    });

    if (!response.ok) {
      await logSupabaseFailure("list posts", response);
      return { ok: false, reason: "unavailable" };
    }

    return { ok: true, posts: filterVisibleCommunityPosts(await readJsonRows(response)) };
  } catch (error) {
    logFetchFailure("list posts", error);
    return { ok: false, reason: "unavailable" };
  }
}

export async function getPublicCommunityPost(id: string): Promise<CommunityPostDetailResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const params = buildCommunityPostDetailSearchParams(id);
    const response = await fetch(`${config.url}/rest/v1/posts?${params.toString()}`, {
      headers: getHeaders(config),
      cache: "no-store",
    });

    if (!response.ok) {
      await logSupabaseFailure("get post", response);
      return { ok: false, reason: "unavailable" };
    }

    const [post] = filterVisibleCommunityPosts(await readJsonRows(response));
    return { ok: true, post: post ?? null };
  } catch (error) {
    logFetchFailure("get post", error);
    return { ok: false, reason: "unavailable" };
  }
}

export async function createCommunityPost(input: CommunityPostInput): Promise<CommunityPostCreateResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const response = await fetch(`${config.url}/rest/v1/posts`, {
      method: "POST",
      headers: {
        ...getHeaders(config),
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
    });

    if (!response.ok) {
      await logSupabaseFailure("create post", response);
      return { ok: false, reason: "unavailable" };
    }

    // A 2xx response means Supabase stored the row. The response body is optional
    // here because the list refreshes from the database after a successful save.
    await readJsonRows(response);
    return { ok: true };
  } catch (error) {
    logFetchFailure("create post", error);
    return { ok: false, reason: "unavailable" };
  }
}
