export const COMMUNITY_VOTE_STATES = ["up", "down", "none"] as const;

export type CommunityVoteState = (typeof COMMUNITY_VOTE_STATES)[number];

export type CommunityVoteCounts = { up: number; down: number };

export type CommunityVoteSummary = CommunityVoteCounts & { myVote: CommunityVoteState };

export function parseCommunityVoteState(value: unknown): CommunityVoteState | null {
  return typeof value === "string" && (COMMUNITY_VOTE_STATES as readonly string[]).includes(value)
    ? (value as CommunityVoteState)
    : null;
}

export function communityVoteStateFromValue(value: unknown): CommunityVoteState {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return "none";
}

export function summarizeCommunityVotes(
  rows: unknown[],
  voterHash: string | null,
): CommunityVoteSummary {
  let up = 0;
  let down = 0;
  let myVote: CommunityVoteState = "none";

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;

    if (record.value === 1) up += 1;
    else if (record.value === -1) down += 1;
    else continue;

    if (voterHash && record.voter_hash === voterHash) {
      myVote = communityVoteStateFromValue(record.value);
    }
  }

  return { up, down, myVote };
}

export function aggregateCommunityVotes(rows: unknown[]): Record<string, CommunityVoteCounts> {
  const summaries: Record<string, CommunityVoteCounts> = {};

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;

    const rawPostId = record.post_id;
    const postId = typeof rawPostId === "string" || typeof rawPostId === "number"
      ? String(rawPostId)
      : null;
    if (!postId) continue;

    if (record.value !== 1 && record.value !== -1) continue;

    const entry = summaries[postId] ?? { up: 0, down: 0 };
    if (record.value === 1) entry.up += 1;
    else entry.down += 1;
    summaries[postId] = entry;
  }

  return summaries;
}

export function formatCommunityVoteCount(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(Math.trunc(value)) : "0";
}

export function buildCommunityPostVotesSearchParams(postId: string): URLSearchParams {
  return new URLSearchParams({
    select: "voter_hash,value",
    post_id: `eq.${postId}`,
  });
}

export function buildCommunityVoteSummarySearchParams(postIds: string[]): URLSearchParams {
  const ids = postIds.filter((id) => /^[A-Za-z0-9_-]+$/.test(id));

  return new URLSearchParams({
    select: "post_id,value",
    post_id: `in.(${ids.join(",")})`,
  });
}
