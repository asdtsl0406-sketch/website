import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMMUNITY_BODY_MAX_LENGTH,
  COMMUNITY_TITLE_MAX_LENGTH,
  buildCommunityPostDetailSearchParams,
  buildCommunityPostListSearchParams,
  filterVisibleCommunityPosts,
  formatCommunityPostDate,
  parseCommunityPostRow,
  toCommunityBoardId,
  validateCommunityPostInput,
} from "../src/lib/community-posts.ts";
import {
  COMMUNITY_POST_RATE_LIMIT_MAX,
  COMMUNITY_POST_RATE_LIMIT_WINDOW_MS,
  checkCommunityPostRateLimit,
} from "../src/lib/community-rate-limit.ts";
import { buildSupabaseHeaders } from "../src/lib/supabase-headers.ts";

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

test("valid input is trimmed and accepted", () => {
  const result = validateCommunityPostInput({
    board: "players_tactics",
    title: "  제목  ",
    body: "  본문  ",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    board: "players_tactics",
    title: "제목",
    body: "본문",
  });
});

test("legacy board values are not accepted by the write API", () => {
  for (const board of ["tactics_players", "free_chat", "unknown", ""]) {
    const result = validateCommunityPostInput({ board, title: "제목", body: "본문" });
    assert.equal(result.ok, false);
    assert.equal(result.errors.board, "게시판을 선택해주세요.");
  }
});

test("blank title and body are rejected", () => {
  const result = validateCommunityPostInput({ board: "free", title: "   ", body: "\n\t" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.title, "제목을 입력해주세요.");
  assert.equal(result.errors.body, "본문을 입력해주세요.");
});

test("non-object payloads are rejected", () => {
  for (const payload of [null, [], "text", 123]) {
    const result = validateCommunityPostInput(payload);
    assert.equal(result.ok, false);
    assert.equal(result.errors.board, "게시판을 선택해주세요.");
  }
});

test("title limit is 100 characters", () => {
  const accepted = validateCommunityPostInput({
    board: "match_discussion",
    title: "가".repeat(COMMUNITY_TITLE_MAX_LENGTH),
    body: "본문",
  });
  assert.equal(accepted.ok, true);

  const rejected = validateCommunityPostInput({
    board: "match_discussion",
    title: "가".repeat(COMMUNITY_TITLE_MAX_LENGTH + 1),
    body: "본문",
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.errors.title, /100자/);
});

test("body limit is 3000 characters", () => {
  const accepted = validateCommunityPostInput({
    board: "free",
    title: "제목",
    body: "가".repeat(COMMUNITY_BODY_MAX_LENGTH),
  });
  assert.equal(accepted.ok, true);

  const rejected = validateCommunityPostInput({
    board: "free",
    title: "제목",
    body: "가".repeat(COMMUNITY_BODY_MAX_LENGTH + 1),
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.errors.body, /3000자/);
});

test("hidden and malformed rows are excluded from public results", () => {
  const rows = [
    {
      id: "visible-1",
      board: "free",
      title: "보이는 글",
      body: "본문",
      created_at: "2026-11-18T09:00:00+00:00",
      is_hidden: false,
    },
    {
      id: "hidden-1",
      board: "free",
      title: "숨김 글",
      body: "본문",
      created_at: "2026-11-18T10:00:00+00:00",
      is_hidden: true,
    },
    {
      id: "hidden-2",
      board: "free",
      title: "숨김 값이 null인 글",
      body: "본문",
      created_at: "2026-11-18T11:00:00+00:00",
      is_hidden: null,
    },
    {
      id: "bad-board",
      board: "tactics_players",
      title: "잘못된 게시판",
      body: "본문",
      created_at: "2026-11-18T12:00:00+00:00",
      is_hidden: false,
    },
  ];

  const posts = filterVisibleCommunityPosts(rows);
  assert.deepEqual(posts.map((post) => post.id), ["visible-1"]);
  assert.equal(parseCommunityPostRow(rows[1]).isHidden, true);
  assert.equal(parseCommunityPostRow(rows[2]).isHidden, true);
});

test("public list and detail queries always filter is_hidden=false", () => {
  const list = buildCommunityPostListSearchParams();
  assert.equal(list.get("is_hidden"), "eq.false");
  assert.equal(list.get("order"), "created_at.desc");

  const detail = buildCommunityPostDetailSearchParams("post-id");
  assert.equal(detail.get("is_hidden"), "eq.false");
  assert.equal(detail.get("id"), "eq.post-id");
});

test("legacy screen board ids map to database board values", () => {
  assert.equal(toCommunityBoardId("match_discussion"), "match_discussion");
  assert.equal(toCommunityBoardId("tactics_players"), "players_tactics");
  assert.equal(toCommunityBoardId("free_chat"), "free");
});

test("created date formatting is stable", () => {
  assert.equal(formatCommunityPostDate("2026-11-18T09:30:00+00:00"), "2026.11.18");
  assert.equal(formatCommunityPostDate("not-a-date"), "");
});

test("in-memory consecutive post limit rejects the third attempt", () => {
  const key = `test-${Date.now()}-${Math.random()}`;
  const now = 1_000_000;
  for (let index = 0; index < COMMUNITY_POST_RATE_LIMIT_MAX; index += 1) {
    assert.equal(checkCommunityPostRateLimit(key, now + index).allowed, true);
  }

  const blocked = checkCommunityPostRateLimit(key, now + COMMUNITY_POST_RATE_LIMIT_MAX);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);

  const afterWindow = checkCommunityPostRateLimit(
    key,
    now + COMMUNITY_POST_RATE_LIMIT_WINDOW_MS + 1,
  );
  assert.equal(afterWindow.allowed, true);
});

test("new Supabase secret keys are sent on apikey only", () => {
  for (const key of ["sb_secret_test", "sb_publishable_test"]) {
    const headers = buildSupabaseHeaders(key);
    assert.equal(headers.apikey, key);
    assert.equal("Authorization" in headers, false);
  }
});

test("legacy JWT keys also send Authorization Bearer", () => {
  const key = "eyJ-legacy-service-role";
  const headers = buildSupabaseHeaders(key);
  assert.equal(headers.apikey, key);
  assert.equal(headers.Authorization, `Bearer ${key}`);
});

test("client bundle source does not reference server-only Supabase variables", () => {
  const clientSource = readFileSync(
    new URL("../src/app/community/community-feed.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(clientSource.includes("SUPABASE_SECRET_KEY"), false);
  assert.equal(clientSource.includes("SUPABASE_URL"), false);
  assert.equal(clientSource.includes("NEXT_PUBLIC_SUPABASE"), false);
});

test("community pages do not render untrusted HTML", () => {
  for (const file of ["../src/app/community/page.tsx", "../src/app/community/[id]/page.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  }
});

console.log(`\n${passed} checks passed`);
