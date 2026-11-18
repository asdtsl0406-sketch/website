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
import { buildSupabaseHeaders, normalizeSupabaseValue } from "../src/lib/supabase-headers.ts";
import {
  SUPABASE_NETWORK_MESSAGES,
  classifySupabaseFetchFailure,
} from "../src/lib/supabase-failure.ts";
import {
  aggregateCommunityVotes,
  buildCommunityPostVotesSearchParams,
  buildCommunityVoteSummarySearchParams,
  parseCommunityVoteState,
  summarizeCommunityVotes,
} from "../src/lib/community-votes.ts";
import {
  COMMUNITY_VISITOR_COOKIE,
  buildCommunityVisitorCookieOptions,
  createCommunityVisitorId,
  isCommunityVisitorId,
} from "../src/lib/community-visitor.ts";
import { isSameOriginRequest } from "../src/lib/community-origin.ts";

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

test("vote state accepts only up, down, or none", () => {
  assert.equal(parseCommunityVoteState("up"), "up");
  assert.equal(parseCommunityVoteState("down"), "down");
  assert.equal(parseCommunityVoteState("none"), "none");

  for (const value of ["UP", "", null, undefined, 1, -1, "cancel", {}, []]) {
    assert.equal(parseCommunityVoteState(value), null);
  }
});

test("vote totals are aggregated from stored rows only", () => {
  const rows = [
    { post_id: "p1", value: 1 },
    { post_id: "p1", value: 1 },
    { post_id: "p1", value: -1 },
    { post_id: "p2", value: -1 },
    { post_id: "p1", value: 5 },
    { post_id: "", value: 1 },
    { post_id: "p3", value: "1" },
    null,
  ];

  assert.deepEqual(aggregateCommunityVotes(rows), {
    p1: { up: 2, down: 1 },
    p2: { up: 0, down: 1 },
  });
});

test("my vote comes from the hashed browser identity", () => {
  const rows = [
    { voter_hash: "hash-a", value: 1 },
    { voter_hash: "hash-b", value: -1 },
  ];

  assert.deepEqual(summarizeCommunityVotes(rows, "hash-a"), { up: 1, down: 1, myVote: "up" });
  assert.deepEqual(summarizeCommunityVotes(rows, "hash-b"), { up: 1, down: 1, myVote: "down" });
  assert.deepEqual(summarizeCommunityVotes(rows, null), { up: 1, down: 1, myVote: "none" });
  assert.deepEqual(summarizeCommunityVotes([], "hash-a"), { up: 0, down: 0, myVote: "none" });
});

test("vote queries filter by post and sanitize list ids", () => {
  assert.equal(buildCommunityPostVotesSearchParams("abc-1").get("post_id"), "eq.abc-1");

  const list = buildCommunityVoteSummarySearchParams(["a1", "b-2", "bad,id", "x)y"]);
  assert.equal(list.get("post_id"), "in.(a1,b-2)");
  assert.equal(list.get("select"), "post_id,value");
});

test("anonymous visitor ids are random 64-character hex values", () => {
  const first = createCommunityVisitorId();
  const second = createCommunityVisitorId();

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.match(second, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(isCommunityVisitorId(first), true);

  for (const value of ["", "abc", first.toUpperCase(), `${first}0`, null, undefined]) {
    assert.equal(isCommunityVisitorId(value), false);
  }
});

test("visitor cookie is HttpOnly and Lax, Secure only over HTTPS", () => {
  assert.equal(COMMUNITY_VISITOR_COOKIE, "community_visitor");

  for (const secure of [true, false]) {
    const options = buildCommunityVisitorCookieOptions(secure);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.secure, secure);
    assert.equal(options.path, "/");
    assert.ok(options.maxAge > 0);
  }
});

test("state-changing requests must come from the same origin", () => {
  assert.equal(isSameOriginRequest(null, "site.example"), true);
  assert.equal(isSameOriginRequest("https://site.example", "site.example"), true);
  assert.equal(isSameOriginRequest("https://site.example", null), false);
  assert.equal(isSameOriginRequest("https://evil.example", "site.example"), false);
  assert.equal(isSameOriginRequest("not a url", "site.example"), false);
});

test("Supabase env values are stripped of pasted whitespace", () => {
  assert.equal(
    normalizeSupabaseValue("  https://example.supabase.co\n"),
    "https://example.supabase.co",
  );
  assert.equal(
    normalizeSupabaseValue("sb_secret_test\r\n"),
    "sb_secret_test",
  );
  assert.equal(
    normalizeSupabaseValue("sb_secret_\npart"),
    "sb_secret_part",
  );
  assert.equal(
    normalizeSupabaseValue("\uFEFFhttps://example.supabase.co\u200B"),
    "https://example.supabase.co",
  );
  assert.equal(
    normalizeSupabaseValue("https://exa\u00ADmple.supabase.co\u00A0"),
    "https://example.supabase.co",
  );
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

test("Supabase fetch failures are classified for safe diagnostics", () => {
  const fetchError = (message, cause) =>
    Object.assign(new TypeError(message), cause ? { cause } : {});

  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("fetch failed", Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" })),
    ),
    "address",
  );
  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("fetch failed", Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })),
    ),
    "refused",
  );
  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("fetch failed", Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" })),
    ),
    "timeout",
  );
  assert.equal(
    classifySupabaseFetchFailure(Object.assign(new Error("timed out"), { name: "TimeoutError" })),
    "timeout",
  );
  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("Cannot convert argument to a ByteString because the character at index 5 has a value"),
    ),
    "header",
  );
  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("fetch failed", Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" })),
    ),
    "tls",
  );
  assert.equal(
    classifySupabaseFetchFailure(
      fetchError("fetch failed", Object.assign(new Error("socket hang up"), { code: "ECONNRESET" })),
    ),
    "reset",
  );
  assert.equal(classifySupabaseFetchFailure(fetchError("fetch failed")), "unknown");
  assert.equal(classifySupabaseFetchFailure("not an error"), "unknown");

  for (const message of Object.values(SUPABASE_NETWORK_MESSAGES)) {
    assert.ok(message.length > 0);
  }
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
