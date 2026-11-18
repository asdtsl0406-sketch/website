import {
  buildCommunityPostDetailSearchParams,
  buildCommunityPostListSearchParams,
  filterVisibleCommunityPosts,
  type CommunityPost,
  type CommunityPostInput,
} from "./community-posts";
import {
  buildSupabaseHeaders,
  normalizeSupabaseValue,
} from "./supabase-headers";
import {
  aggregateCommunityVotes,
  buildCommunityPostVotesSearchParams,
  buildCommunityVoteSummarySearchParams,
  communityVoteStateFromValue,
  summarizeCommunityVotes,
  type CommunityVoteCounts,
  type CommunityVoteState,
  type CommunityVoteSummary,
} from "./community-votes";
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
  reason: "not_configured" | "unavailable" | "network" | "not_found" | "forbidden";
  status?: number;
  code?: string;
  networkReason?: SupabaseNetworkReason;
  networkHost?: string;
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

export type CommunityVoteResult =
  | { ok: true; summary: CommunityVoteSummary }
  | CommunityStoreFailure;

export type CommunityVoteSummaryResult =
  | { ok: true; summary: CommunityVoteSummary }
  | CommunityStoreFailure;

export type CommunityVoteListResult =
  | { ok: true; votes: Record<string, CommunityVoteCounts> }
  | CommunityStoreFailure;

export type CommunityPostHideResult =
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
  config: SupabaseConfig,
): { reason: SupabaseNetworkReason; host: string } {
  const info: Record<string, unknown> = { operation };
  const host = new URL(config.url).host;

  if (error instanceof Error) {
    info.error = error.name;
    info.message = redactSecret(error.message, config.secretKey);

    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      info.cause = cause.name;
      info.causeMessage = redactSecret(cause.message, config.secretKey);
      const code = (cause as Error & { code?: unknown }).code;
      if (typeof code === "string") info.causeCode = code;
    }
  } else {
    info.error = "unknown";
  }

  const networkReason = classifySupabaseFetchFailure(error);
  info.networkReason = networkReason;
  info.supabaseHost = host;
  console.error("[community] Supabase request failed", info);

  return { reason: networkReason, host };
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
    const failure = logFetchFailure("list posts", error, config);
    return { ok: false, reason: "network", networkReason: failure.reason, networkHost: failure.host };
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
    const failure = logFetchFailure("get post", error, config);
    return { ok: false, reason: "network", networkReason: failure.reason, networkHost: failure.host };
  }
}

async function callSupabaseRpc(
  operation: string,
  config: SupabaseConfig,
  rpc: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | CommunityStoreFailure> {
  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        ...buildSupabaseHeaders(config.secretKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure(operation, response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return { ok: true, data };
  } catch (error) {
    const failure = logFetchFailure(operation, error, config);
    return { ok: false, reason: "network", networkReason: failure.reason, networkHost: failure.host };
  }
}

export async function createCommunityPost(
  input: CommunityPostInput,
  authorHash: string,
): Promise<CommunityPostCreateResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  // The SQL function stores the post and its owner hash in one transaction, so a
  // post can never exist without an owner that is allowed to delete it later.
  const result = await callSupabaseRpc("create post", config, "create_community_post", {
    p_board: input.board,
    p_title: input.title,
    p_body: input.body,
    p_author_hash: authorHash,
  });

  return result.ok ? { ok: true } : result;
}

export async function setCommunityVote(
  postId: string,
  voterHash: string,
  state: CommunityVoteState,
): Promise<CommunityVoteResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const result = await callSupabaseRpc("set vote", config, "set_community_vote", {
    p_post_id: postId,
    p_voter_hash: voterHash,
    p_state: state,
  });
  if (!result.ok) return result;

  if (!result.data || typeof result.data !== "object" || Array.isArray(result.data)) {
    return { ok: false, reason: "unavailable" };
  }

  const data = result.data as Record<string, unknown>;
  if (data.found !== true) return { ok: false, reason: "not_found" };

  const up = Number(data.up);
  const down = Number(data.down);
  if (!Number.isFinite(up) || !Number.isFinite(down)) {
    return { ok: false, reason: "unavailable" };
  }

  return {
    ok: true,
    summary: {
      up: Math.max(0, Math.trunc(up)),
      down: Math.max(0, Math.trunc(down)),
      myVote: communityVoteStateFromValue(data.myVote),
    },
  };
}

export async function getCommunityPostVotes(
  postId: string,
  voterHash: string | null,
): Promise<CommunityVoteSummaryResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    const params = buildCommunityPostVotesSearchParams(postId);
    const response = await fetch(`${config.url}/rest/v1/post_votes?${params.toString()}`, {
      headers: buildSupabaseHeaders(config.secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure("get votes", response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    return {
      ok: true,
      summary: summarizeCommunityVotes(await readJsonRows(response), voterHash),
    };
  } catch (error) {
    const failure = logFetchFailure("get votes", error, config);
    return { ok: false, reason: "network", networkReason: failure.reason, networkHost: failure.host };
  }
}

export async function listCommunityVoteSummaries(
  postIds: string[],
): Promise<CommunityVoteListResult> {
  if (postIds.length === 0) return { ok: true, votes: {} };

  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  try {
    // One request for every post on the page instead of one request per post.
    const params = buildCommunityVoteSummarySearchParams(postIds);
    const response = await fetch(`${config.url}/rest/v1/post_votes?${params.toString()}`, {
      headers: buildSupabaseHeaders(config.secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await logSupabaseFailure("list votes", response, config.secretKey);
      return { ok: false, reason: "unavailable", status: response.status, code: details.code };
    }

    return { ok: true, votes: aggregateCommunityVotes(await readJsonRows(response)) };
  } catch (error) {
    const failure = logFetchFailure("list votes", error, config);
    return { ok: false, reason: "network", networkReason: failure.reason, networkHost: failure.host };
  }
}

export async function isCommunityPostOwner(postId: string, authorHash: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;

  const params = new URLSearchParams({
    select: "post_id",
    post_id: `eq.${postId}`,
    author_hash: `eq.${authorHash}`,
    limit: "1",
  });

  try {
    const response = await fetch(`${config.url}/rest/v1/post_authors?${params.toString()}`, {
      headers: buildSupabaseHeaders(config.secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      await logSupabaseFailure("check post owner", response, config.secretKey);
      return false;
    }

    return (await readJsonRows(response)).length > 0;
  } catch (error) {
    logFetchFailure("check post owner", error, config);
    return false;
  }
}

export async function hideOwnedCommunityPost(
  postId: string,
  authorHash: string,
): Promise<CommunityPostHideResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  // Ownership is enforced inside the UPDATE statement, not only by hiding the button.
  const result = await callSupabaseRpc("delete post", config, "hide_community_post", {
    p_post_id: postId,
    p_author_hash: authorHash,
  });
  if (!result.ok) return result;

  return result.data === true ? { ok: true } : { ok: false, reason: "forbidden" };
}
