import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const TEST_SECRET = "sb_secret_integration-test";
const DEV_PORT = 39123;
const baseUrl = `http://127.0.0.1:${DEV_PORT}`;

const mockPosts = [
  {
    id: "visible-seed",
    board: "free",
    title: "공개 시드 글",
    body: "공개 시드 본문",
    created_at: "2026-11-17T10:00:00+00:00",
    is_hidden: false,
  },
  {
    id: "hidden-seed",
    board: "free",
    title: "숨김 시드 글",
    body: "숨김 시드 본문",
    created_at: "2026-11-18T10:00:00+00:00",
    is_hidden: true,
  },
  {
    id: "votes-fail-seed",
    board: "free",
    title: "집계 실패 시드 글",
    body: "집계 실패 시드 본문",
    created_at: "2026-11-16T10:00:00+00:00",
    is_hidden: false,
  },
];

const mockAuthors = new Map();
const mockVotes = new Map();
const mockState = { nextId: 1, createdCount: 0, lastCreatedId: null, failListVotes: false };
const apiResponses = [];

const voteKey = (postId, voterHash) => `${postId}\u0000${voterHash}`;

function checkAuthorization(request) {
  if (request.headers.apikey !== TEST_SECRET) return false;

  // New sb_ keys are opaque and must not be sent as a Bearer token.
  if (TEST_SECRET.startsWith("sb_")) return !request.headers.authorization;
  return request.headers.authorization === `Bearer ${TEST_SECRET}`;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function filterParam(value) {
  if (!value) return null;
  if (value.startsWith("eq.")) return { type: "eq", values: [value.slice(3)] };
  if (value.startsWith("in.(") && value.endsWith(")")) {
    return { type: "in", values: value.slice(4, -1).split(",").filter(Boolean) };
  }
  return null;
}

function matchPostFilter(postId, filter) {
  if (!filter) return true;
  return filter.values.includes(String(postId));
}

const mockSupabase = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };

  if (!url.pathname.startsWith("/rest/v1/")) return send(404, { message: "not found" });
  if (!checkAuthorization(request)) return send(401, { message: "unauthorized" });

  if (url.pathname === "/rest/v1/posts" && request.method === "GET") {
    let rows = [...mockPosts];

    if (url.searchParams.get("is_hidden") === "eq.false") {
      rows = rows.filter((post) => post.is_hidden === false);
    }

    const idFilter = filterParam(url.searchParams.get("id"));
    if (idFilter) rows = rows.filter((post) => matchPostFilter(post.id, idFilter));

    if (url.searchParams.get("order") === "created_at.desc") {
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const limit = Number(url.searchParams.get("limit") ?? rows.length);
    rows = rows.slice(0, Number.isFinite(limit) ? limit : rows.length);

    return send(200, rows);
  }

  if (url.pathname === "/rest/v1/post_votes" && request.method === "GET") {
    const filter = filterParam(url.searchParams.get("post_id"));

    // Failure injection for the "aggregate unavailable" checks only.
    const failsOnSeed = filter?.values.includes("votes-fail-seed");
    if (failsOnSeed && (filter.type === "eq" || mockState.failListVotes)) {
      return send(500, { message: "vote aggregate unavailable" });
    }

    const rows = [...mockVotes.values()]
      .filter((vote) => matchPostFilter(vote.post_id, filter))
      .map(({ post_id, voter_hash, value }) => ({ post_id, voter_hash, value }));

    return send(200, rows);
  }

  if (url.pathname === "/rest/v1/post_authors" && request.method === "GET") {
    const postFilter = filterParam(url.searchParams.get("post_id"));
    const authorFilter = filterParam(url.searchParams.get("author_hash"));

    const rows = [...mockAuthors.entries()]
      .filter(([postId]) => matchPostFilter(postId, postFilter))
      .filter(([, hash]) => !authorFilter || authorFilter.values.includes(hash))
      .map(([post_id]) => ({ post_id }));

    const limit = Number(url.searchParams.get("limit") ?? rows.length);
    return send(200, rows.slice(0, Number.isFinite(limit) ? limit : rows.length));
  }

  if (url.pathname === "/rest/v1/rpc/create_community_post" && request.method === "POST") {
    const body = await readJson(request);
    const row = {
      id: `mock-created-${mockState.nextId}`,
      board: body.p_board,
      title: body.p_title,
      body: body.p_body,
      created_at: new Date().toISOString(),
      is_hidden: false,
    };
    mockState.nextId += 1;
    mockState.createdCount += 1;
    mockState.lastCreatedId = row.id;

    mockPosts.push(row);
    mockAuthors.set(row.id, body.p_author_hash);

    return send(201, row.id);
  }

  if (url.pathname === "/rest/v1/rpc/set_community_vote" && request.method === "POST") {
    const body = await readJson(request);
    const postId = String(body.p_post_id);
    const voterHash = String(body.p_voter_hash);
    const state = String(body.p_state);

    if (!["up", "down", "none"].includes(state)) {
      return send(400, { code: "22023", message: "invalid vote state" });
    }

    const post = mockPosts.find((item) => item.id === postId && item.is_hidden === false);
    if (!post) return send(200, { found: false });

    const key = voteKey(postId, voterHash);
    if (state === "none") mockVotes.delete(key);
    else mockVotes.set(key, { post_id: postId, voter_hash: voterHash, value: state === "up" ? 1 : -1 });

    const rows = [...mockVotes.values()].filter((vote) => vote.post_id === postId);
    const mine = mockVotes.get(key);

    return send(200, {
      found: true,
      up: rows.filter((vote) => vote.value === 1).length,
      down: rows.filter((vote) => vote.value === -1).length,
      myVote: mine ? mine.value : 0,
    });
  }

  if (url.pathname === "/rest/v1/rpc/hide_community_post" && request.method === "POST") {
    const body = await readJson(request);
    const post = mockPosts.find(
      (item) => item.id === String(body.p_post_id) && item.is_hidden === false,
    );
    const owned = post && mockAuthors.get(post.id) === String(body.p_author_hash);

    if (!owned) return send(200, false);

    post.is_hidden = true;
    return send(200, true);
  }

  return send(405, { message: "method not allowed" });
});

function createBrowser(label, ip) {
  let cookie = "";

  async function request(pathname, options = {}) {
    const headers = new Headers(options.headers ?? {});
    if (cookie) headers.set("cookie", cookie);
    headers.set("x-forwarded-for", ip);
    headers.set("user-agent", `verify-${label}`);

    if (options.origin !== undefined) {
      if (options.origin) headers.set("origin", options.origin);
    } else if ((options.method ?? "GET") !== "GET") {
      headers.set("origin", baseUrl);
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(60_000),
    });

    const setCookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

    for (const value of setCookies) {
      const pair = value.split(";")[0] ?? "";
      if (pair.startsWith("community_visitor=")) cookie = pair;
    }

    return response;
  }

  async function page(pathname) {
    const response = await request(pathname);
    const html = await response.text();
    apiResponses.push(html);
    return { response, html };
  }

  async function json(pathname, options = {}) {
    const response = await request(pathname, options);
    const text = await response.text();
    apiResponses.push(text);

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    return { response, text, json: parsed };
  }

  return {
    label,
    request,
    page,
    json,
    getCookie: () => cookie,
    async visit() {
      const { response } = await page("/community");
      assert.equal(response.status, 200);
      assert.ok(
        cookie.startsWith("community_visitor="),
        `${label} should receive the anonymous visitor cookie`,
      );
      return cookie;
    },
    vote(postId, state, options) {
      return json(`/api/community/posts/${encodeURIComponent(postId)}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
        ...options,
      });
    },
    remove(postId, options) {
      return json(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
        ...options,
      });
    },
    createPost(payload) {
      return json("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  };
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/community`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) return;
    } catch {
      // The dev server is still starting or compiling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Next dev server did not become ready in time.");
}

let devProcess;
let devLogs = "";

try {
  await new Promise((resolve) => mockSupabase.listen(0, "127.0.0.1", resolve));
  const mockAddress = mockSupabase.address();
  const mockUrl = `http://127.0.0.1:${mockAddress.port}`;

  devProcess = spawn(
    process.execPath,
    [nextBin, "dev", "-p", String(DEV_PORT), "-H", "127.0.0.1"],
    {
      cwd: root,
      env: {
        ...process.env,
        SUPABASE_URL: mockUrl,
        SUPABASE_SECRET_KEY: TEST_SECRET,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  devProcess.stdout.on("data", (chunk) => { devLogs += chunk.toString(); });
  devProcess.stderr.on("data", (chunk) => { devLogs += chunk.toString(); });

  await waitForServer();

  const browserA = createBrowser("A", "10.0.0.1");
  const browserB = createBrowser("B", "10.0.0.2");

  const cookieA = await browserA.visit();
  await browserB.visit();

  assert.match(cookieA, /^community_visitor=[a-f0-9]{64}$/);

  const listPage = await browserA.page("/community");
  assert.equal(listPage.response.status, 200);
  assert.ok(listPage.html.includes("공개 시드 글"), "public post should be listed");
  assert.ok(!listPage.html.includes("숨김 시드 글"), "hidden post must not be listed");
  assert.ok(listPage.html.includes("익명 글쓰기"), "anonymous write button should exist");

  const visibleDetail = await browserA.page("/community/visible-seed");
  assert.equal(visibleDetail.response.status, 200);
  assert.ok(visibleDetail.html.includes("공개 시드 본문"));
  assert.ok(visibleDetail.html.includes("익명"));

  const hiddenDetail = await browserA.page("/community/hidden-seed");
  assert.equal(hiddenDetail.response.status, 200);
  assert.ok(hiddenDetail.html.includes("게시글을 찾을 수 없습니다."));
  assert.ok(!hiddenDetail.html.includes("숨김 시드 본문"));
  console.log("ok - hidden posts are absent from the list and detail pages");

  const beforeInvalidPosts = mockState.createdCount;

  const legacyBoard = await browserA.createPost({ board: "free_chat", title: "제목", body: "본문" });
  assert.equal(legacyBoard.response.status, 400);
  assert.equal(legacyBoard.json.fieldErrors.board, "게시판을 선택해주세요.");

  const blankTitle = await browserA.createPost({ board: "free", title: "   ", body: "본문" });
  assert.equal(blankTitle.response.status, 400);
  assert.equal(blankTitle.json.fieldErrors.title, "제목을 입력해주세요.");

  const longTitle = await browserA.createPost({ board: "free", title: "가".repeat(101), body: "본문" });
  assert.equal(longTitle.response.status, 400);

  const longBody = await browserA.createPost({ board: "free", title: "제목", body: "가".repeat(3001) });
  assert.equal(longBody.response.status, 400);

  assert.equal(mockState.createdCount, beforeInvalidPosts, "invalid requests must not insert rows");
  console.log("ok - invalid board, blank/long inputs are rejected before storage");

  const created = await browserA.createPost({
    board: "players_tactics",
    title: "통합 테스트 익명 글",
    body: "첫 줄\n둘째 줄",
  });
  assert.equal(created.response.status, 201);
  assert.equal(mockState.createdCount, beforeInvalidPosts + 1);
  const postA1 = mockState.lastCreatedId;

  const refreshedList = await browserA.page("/community");
  assert.ok(refreshedList.html.includes("통합 테스트 익명 글"));

  const createdDetail = await browserA.page(`/community/${postA1}`);
  assert.ok(createdDetail.html.includes("통합 테스트 익명 글"));
  assert.ok(createdDetail.html.includes("익명"));
  console.log("ok - a valid anonymous post is stored through the server route and is publicly readable");

  const escaped = await browserA.createPost({
    board: "match_discussion",
    title: "<b>HTML 제목</b>",
    body: "<img src=x onerror=alert(1)>",
  });
  assert.equal(escaped.response.status, 201);
  const postA2 = mockState.lastCreatedId;

  const escapedDetail = await browserA.page(`/community/${postA2}`);
  assert.ok(escapedDetail.html.includes("&lt;b&gt;HTML 제목&lt;/b&gt;"));
  assert.ok(!escapedDetail.html.includes("<b>HTML 제목</b>"));
  assert.ok(escapedDetail.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!escapedDetail.html.includes("<img src=x onerror=alert(1)>"));
  console.log("ok - HTML-like title and body are rendered as escaped text");

  const rateLimited = await browserA.createPost({
    board: "free",
    title: "세 번째 연속 등록",
    body: "연속 등록 제한 확인",
  });
  assert.equal(rateLimited.response.status, 429);
  assert.ok(Number(rateLimited.response.headers.get("retry-after")) > 0);
  assert.equal(mockState.createdCount, beforeInvalidPosts + 2, "rate-limited request must not insert rows");
  console.log("ok - consecutive anonymous posts are rate-limited in the server");

  const browserBCreated = await browserB.createPost({
    board: "free",
    title: "B 브라우저가 쓴 글",
    body: "B 브라우저 본문",
  });
  assert.equal(browserBCreated.response.status, 201);
  const postB1 = mockState.lastCreatedId;
  assert.notEqual(postA2, postB1);

  const ownerView = await browserA.page(`/community/${postA2}`);
  assert.ok(ownerView.html.includes("글 삭제"), "the author browser should see the delete control");

  const strangerView = await browserB.page(`/community/${postA2}`);
  assert.ok(!strangerView.html.includes("글 삭제"), "other browsers must not see the delete control");

  const seededDetail = await browserA.page("/community/visible-seed");
  assert.ok(!seededDetail.html.includes("글 삭제"), "posts without ownership must not be deletable");
  console.log("ok - the delete control only appears for the browser that wrote the post");

  // --- votes -------------------------------------------------------------

  const upVote = await browserA.vote("visible-seed", "up");
  assert.equal(upVote.response.status, 200);
  assert.deepEqual(upVote.json, { ok: true, up: 1, down: 0, myVote: "up" });
  assert.equal(upVote.response.headers.get("cache-control"), "no-store");

  const repeatedUp = await browserA.vote("visible-seed", "up");
  assert.deepEqual(repeatedUp.json, { ok: true, up: 1, down: 0, myVote: "up" });

  const switchedDown = await browserA.vote("visible-seed", "down");
  assert.deepEqual(switchedDown.json, { ok: true, up: 0, down: 1, myVote: "down" });

  const cancelled = await browserA.vote("visible-seed", "none");
  assert.deepEqual(cancelled.json, { ok: true, up: 0, down: 0, myVote: "none" });
  console.log("ok - vote, repeat, switch, and cancel are idempotent final states");

  const concurrent = await Promise.all([
    browserA.vote(postB1, "up"),
    browserA.vote(postB1, "up"),
  ]);
  for (const result of concurrent) assert.equal(result.response.status, 200);

  const concurrentDetail = await browserA.page(`/community/${postB1}`);
  assert.ok(concurrentDetail.html.includes("<b>1</b>"), "concurrent repeats must keep a single vote");
  assert.ok(concurrentDetail.html.includes('aria-pressed="true"'), "the active vote is marked pressed");
  await browserA.vote(postB1, "none");
  console.log("ok - repeated and concurrent votes keep one row per browser");

  const voteA = await browserA.vote("visible-seed", "up");
  assert.deepEqual(voteA.json, { ok: true, up: 1, down: 0, myVote: "up" });

  const voteB = await browserB.vote("visible-seed", "up");
  assert.deepEqual(voteB.json, { ok: true, up: 2, down: 0, myVote: "up" });

  const downB = await browserB.vote("visible-seed", "down");
  assert.deepEqual(downB.json, { ok: true, up: 1, down: 1, myVote: "down" });
  console.log("ok - votes from two browsers are summed, and one browser holds one vote");

  const persisted = await browserA.page("/community/visible-seed");
  assert.ok(persisted.html.includes("<b>1</b>"), "the aggregate should persist after reload");
  assert.ok(persisted.html.includes('aria-pressed="true"'), "my vote should persist after reload");
  assert.ok(persisted.html.includes("추천"));
  assert.ok(persisted.html.includes("비추천"));

  const listWithVotes = await browserA.page("/community");
  // React may separate adjacent text and expression nodes with comment markers.
  assert.match(listWithVotes.html, /(?<!비)추천(?:<!-- -->|\s)*1/);
  assert.match(listWithVotes.html, /비추천(?:<!-- -->|\s)*1/);
  console.log("ok - votes persist after reload and the list shows aggregates");

  const hiddenVote = await browserA.vote("hidden-seed", "up");
  assert.equal(hiddenVote.response.status, 404);

  const exampleVote = await browserA.vote("example-match-1", "up");
  assert.equal(exampleVote.response.status, 404);

  const missingVote = await browserA.vote("does-not-exist", "up");
  assert.equal(missingVote.response.status, 404);

  const badState = await browserA.vote("visible-seed", "cancel");
  assert.equal(badState.response.status, 400);

  const badOriginVote = await browserA.vote("visible-seed", "up", { origin: "http://evil.example" });
  assert.equal(badOriginVote.response.status, 403);

  const noCookieVote = await fetch(`${baseUrl}/api/community/posts/visible-seed/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.9" },
    body: JSON.stringify({ state: "up" }),
    signal: AbortSignal.timeout(60_000),
  });
  assert.equal(noCookieVote.status, 400);
  await noCookieVote.arrayBuffer();
  console.log("ok - hidden, missing, example, malformed, cross-origin, and cookie-less votes are refused");

  // --- delete ------------------------------------------------------------

  const strangerDelete = await browserB.remove(postA2);
  assert.equal(strangerDelete.response.status, 403);
  assert.equal(strangerDelete.response.headers.get("cache-control"), "no-store");

  const stillThere = await browserB.page(`/community/${postA2}`);
  assert.ok(stillThere.html.includes("HTML 제목"), "a refused delete must not hide the post");
  console.log("ok - another browser cannot delete a post through the API");

  const ownerDelete = await browserA.remove(postA2);
  assert.equal(ownerDelete.response.status, 200);

  const afterDeleteList = await browserA.page("/community");
  assert.ok(!afterDeleteList.html.includes("HTML 제목"));

  const afterDeleteDetail = await browserA.page(`/community/${postA2}`);
  assert.ok(afterDeleteDetail.html.includes("게시글을 찾을 수 없습니다."));

  const voteHidden = await browserA.vote(postA2, "up");
  assert.equal(voteHidden.response.status, 404);
  console.log("ok - the author delete hides the post from the list, detail, and vote API");

  const exampleDetail = await browserA.page("/community/example-match-1");
  assert.ok(!exampleDetail.html.includes("글 삭제"));
  assert.ok(!exampleDetail.html.includes("aria-pressed"));
  assert.ok(!exampleDetail.html.includes("비추천"));
  console.log("ok - example posts keep no vote or delete controls");

  // --- aggregate failure -------------------------------------------------

  const failedAggregateList = await (async () => {
    mockState.failListVotes = true;
    const page = await browserA.page("/community");
    mockState.failListVotes = false;
    return page;
  })();
  assert.ok(!failedAggregateList.html.includes("비추천"), "failed aggregates must not render as 0");

  const failedAggregateDetail = await browserA.page("/community/votes-fail-seed");
  assert.ok(failedAggregateDetail.html.includes("–"), "failed aggregates show an unavailable marker");
  assert.ok(!failedAggregateDetail.html.includes("<b>0</b>"));
  console.log("ok - a failed aggregate request is not displayed as zero votes");

  // --- secrets -----------------------------------------------------------

  const cookieIdA = cookieA.split("=")[1];
  const hashA = createHash("sha256").update(cookieIdA).digest("hex");

  // Dev mode only: React's async debug instrumentation streams the resolved
  // value of cookies() into the __next_f payload, together with module paths.
  // Production builds do not contain it (checked separately by the build probe).
  function withoutDevInstrumentation(text) {
    return text.replace(/self\.__next_f\.push\(\[1,"(?:[^"\\]|\\.)*"\]\)/g, (chunk) =>
      chunk.includes("webpack-internal:///(rsc)/") ? "" : chunk,
    );
  }

  const leakSources = [
    ...apiResponses.map((text, index) => [`response #${index}`, text]),
    ["next dev logs", devLogs],
  ];

  for (const [source, text] of leakSources) {
    if (typeof text !== "string") continue;

    for (const [name, needle] of [
      ["test secret", TEST_SECRET],
      ["raw visitor id", cookieIdA],
      ["hashed visitor id", hashA],
      ["voter_hash column", "voter_hash"],
    ]) {
      // Identity values are re-checked against the dev-instrumentation-free text.
      const isIdentity = needle === cookieIdA || needle === hashA;
      const haystack = isIdentity ? withoutDevInstrumentation(text) : text;
      const at = haystack.indexOf(needle);
      if (at === -1) continue;

      assert.fail(
        `${name} leaked into ${source} at offset ${at}: ` +
          JSON.stringify(haystack.slice(Math.max(0, at - 120), at + 120)),
      );
    }
  }
  console.log("ok - keys, visitor identifiers, and hashes are not exposed");

  console.log("\nintegration checks passed");
} catch (error) {
  console.error(error);
  if (devLogs) console.error(`\n--- next dev logs ---\n${devLogs.slice(-8000)}`);
  process.exitCode = 1;
} finally {
  if (devProcess?.pid) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(devProcess.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      devProcess.kill("SIGTERM");
    }
  }
  await new Promise((resolve) => mockSupabase.close(resolve));
}
