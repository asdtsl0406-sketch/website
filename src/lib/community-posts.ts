export const COMMUNITY_BOARD_IDS = ["match_discussion", "players_tactics", "free"] as const;

export type CommunityContentBoardId = (typeof COMMUNITY_BOARD_IDS)[number];
export type CommunityBoardViewId = "all" | CommunityContentBoardId;

export const communityPostBoards = [
  { id: "all", label: "전체", hint: "모든 게시글을 모아 봅니다" },
  { id: "match_discussion", label: "경기 토론", hint: "경기 전·후 생각을 나눠요" },
  { id: "players_tactics", label: "선수·전술", hint: "포메이션과 선수 이야기를 해요" },
  { id: "free", label: "자유게시판", hint: "유니폼·직관·일상 이야기도 환영" },
] as const;

export const COMMUNITY_TITLE_MAX_LENGTH = 100;
export const COMMUNITY_BODY_MAX_LENGTH = 3000;
export const COMMUNITY_POSTS_LIMIT = 50;
export const COMMUNITY_POST_SELECT = "id,board,title,body,created_at,is_hidden";

export type CommunityPost = {
  id: string;
  board: CommunityContentBoardId;
  title: string;
  body: string;
  createdAt: string;
};

export type CommunityPostInput = {
  board: CommunityContentBoardId;
  title: string;
  body: string;
};

export type CommunityPostField = "board" | "title" | "body";
export type CommunityPostFieldErrors = Partial<Record<CommunityPostField, string>>;

export type CommunityPostValidation =
  | { ok: true; value: CommunityPostInput }
  | { ok: false; errors: CommunityPostFieldErrors };

export type ParsedCommunityPost = CommunityPost & { isHidden: boolean };

const legacyBoardMap: Record<string, CommunityContentBoardId> = {
  match_discussion: "match_discussion",
  tactics_players: "players_tactics",
  free_chat: "free",
};

export function isCommunityContentBoard(value: unknown): value is CommunityContentBoardId {
  return typeof value === "string" && (COMMUNITY_BOARD_IDS as readonly string[]).includes(value);
}

export function toCommunityBoardId(value: string): CommunityContentBoardId | null {
  if (isCommunityContentBoard(value)) return value;
  return legacyBoardMap[value] ?? null;
}

export function getCommunityBoardLabel(board: CommunityContentBoardId): string {
  return communityPostBoards.find((item) => item.id === board)?.label ?? board;
}

export function validateCommunityPostInput(input: unknown): CommunityPostValidation {
  const errors: CommunityPostFieldErrors = {};
  const record = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};

  const board = typeof record.board === "string" ? record.board.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";

  if (!isCommunityContentBoard(board)) {
    errors.board = "게시판을 선택해주세요.";
  }
  if (!title) {
    errors.title = "제목을 입력해주세요.";
  } else if (title.length > COMMUNITY_TITLE_MAX_LENGTH) {
    errors.title = `제목은 ${COMMUNITY_TITLE_MAX_LENGTH}자까지 입력할 수 있습니다.`;
  }
  if (!body) {
    errors.body = "본문을 입력해주세요.";
  } else if (body.length > COMMUNITY_BODY_MAX_LENGTH) {
    errors.body = `본문은 ${COMMUNITY_BODY_MAX_LENGTH}자까지 입력할 수 있습니다.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      board: board as CommunityContentBoardId,
      title,
      body,
    },
  };
}

export function parseCommunityPostRow(raw: unknown): ParsedCommunityPost | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const rawId = row.id;
  const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : null;
  if (!id) return null;

  if (!isCommunityContentBoard(row.board)) return null;
  if (typeof row.title !== "string" || typeof row.body !== "string") return null;

  return {
    id,
    board: row.board,
    title: row.title,
    body: row.body,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    isHidden: row.is_hidden !== false,
  };
}

export function filterVisibleCommunityPosts(rows: unknown[]): CommunityPost[] {
  const posts: CommunityPost[] = [];

  for (const row of rows) {
    const parsed = parseCommunityPostRow(row);
    if (!parsed || parsed.isHidden) continue;

    posts.push({
      id: parsed.id,
      board: parsed.board,
      title: parsed.title,
      body: parsed.body,
      createdAt: parsed.createdAt,
    });
  }

  return posts;
}

export function buildCommunityPostListSearchParams(): URLSearchParams {
  return new URLSearchParams({
    select: COMMUNITY_POST_SELECT,
    is_hidden: "eq.false",
    order: "created_at.desc",
    limit: String(COMMUNITY_POSTS_LIMIT),
  });
}

export function buildCommunityPostDetailSearchParams(id: string): URLSearchParams {
  return new URLSearchParams({
    select: COMMUNITY_POST_SELECT,
    id: `eq.${id}`,
    is_hidden: "eq.false",
    limit: "1",
  });
}

export function formatCommunityPostDate(value: string): string {
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart.replaceAll("-", ".") : "";
}
