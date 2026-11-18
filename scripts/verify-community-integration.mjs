import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
];

let nextMockId = 1;
let createdCount = 0;
const apiResponses = [];

function checkAuthorization(request) {
  if (request.headers.apikey !== TEST_SECRET) return false;

  // New sb_ keys are opaque and must not be sent as a Bearer token.
  if (TEST_SECRET.startsWith("sb_")) return !request.headers.authorization;
  return request.headers.authorization === `Bearer ${TEST_SECRET}`;
}

const mockSupabase = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (url.pathname !== "/rest/v1/posts") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "not found" }));
    return;
  }

  if (!checkAuthorization(request)) {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "unauthorized" }));
    return;
  }

  if (request.method === "GET") {
    let rows = [...mockPosts];

    if (url.searchParams.get("is_hidden") === "eq.false") {
      rows = rows.filter((post) => post.is_hidden === false);
    }

    const idFilter = url.searchParams.get("id");
    if (idFilter?.startsWith("eq.")) {
      const wantedId = idFilter.slice(3);
      rows = rows.filter((post) => post.id === wantedId);
    }

    if (url.searchParams.get("order") === "created_at.desc") {
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const limit = Number(url.searchParams.get("limit") ?? rows.length);
    rows = rows.slice(0, Number.isFinite(limit) ? limit : rows.length);

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(rows));
    return;
  }

  if (request.method === "POST") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const row = {
      id: `mock-created-${nextMockId}`,
      board: body.board,
      title: body.title,
      body: body.body,
      created_at: new Date().toISOString(),
      is_hidden: body.is_hidden ?? false,
    };
    nextMockId += 1;
    createdCount += 1;
    mockPosts.push(row);

    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify([row]));
    return;
  }

  response.writeHead(405, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "method not allowed" }));
});

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

async function getPage(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    signal: AbortSignal.timeout(30_000),
  });
  const html = await response.text();
  apiResponses.push(html);
  return { response, html };
}

async function postJson(payload, rawBody) {
  const response = await fetch(`${baseUrl}/api/community/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody ?? JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  apiResponses.push(text);
  return { response, text, json: JSON.parse(text) };
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

  const listPage = await getPage("/community");
  assert.equal(listPage.response.status, 200);
  assert.ok(listPage.html.includes("공개 시드 글"), "public post should be listed");
  assert.ok(!listPage.html.includes("숨김 시드 글"), "hidden post must not be listed");
  assert.ok(listPage.html.includes("익명 글쓰기"), "anonymous write button should exist");

  const visibleDetail = await getPage("/community/visible-seed");
  assert.equal(visibleDetail.response.status, 200);
  assert.ok(visibleDetail.html.includes("공개 시드 본문"));
  assert.ok(visibleDetail.html.includes("익명"));

  const hiddenDetail = await getPage("/community/hidden-seed");
  assert.equal(hiddenDetail.response.status, 200);
  assert.ok(hiddenDetail.html.includes("게시글을 찾을 수 없습니다."));
  assert.ok(!hiddenDetail.html.includes("숨김 시드 본문"));
  console.log("ok - hidden posts are absent from the list and detail pages");

  const beforeInvalidPosts = createdCount;

  const legacyBoard = await postJson({ board: "free_chat", title: "제목", body: "본문" });
  assert.equal(legacyBoard.response.status, 400);
  assert.equal(legacyBoard.json.fieldErrors.board, "게시판을 선택해주세요.");

  const blankTitle = await postJson({ board: "free", title: "   ", body: "본문" });
  assert.equal(blankTitle.response.status, 400);
  assert.equal(blankTitle.json.fieldErrors.title, "제목을 입력해주세요.");

  const longTitle = await postJson({ board: "free", title: "가".repeat(101), body: "본문" });
  assert.equal(longTitle.response.status, 400);

  const longBody = await postJson({ board: "free", title: "제목", body: "가".repeat(3001) });
  assert.equal(longBody.response.status, 400);

  const malformed = await postJson(null, "{");
  assert.equal(malformed.response.status, 400);
  assert.equal(createdCount, beforeInvalidPosts, "invalid requests must not insert rows");
  console.log("ok - invalid board, blank/long inputs, and malformed JSON are rejected before storage");

  const created = await postJson({
    board: "players_tactics",
    title: "통합 테스트 익명 글",
    body: "첫 줄\n둘째 줄",
  });
  assert.equal(created.response.status, 201);
  assert.equal(createdCount, beforeInvalidPosts + 1);

  const refreshedList = await getPage("/community");
  assert.ok(refreshedList.html.includes("통합 테스트 익명 글"));

  const createdDetail = await getPage(`/community/mock-created-1`);
  assert.ok(createdDetail.html.includes("통합 테스트 익명 글"));
  assert.ok(createdDetail.html.includes("익명"));
  console.log("ok - a valid anonymous post is stored through the server route and is publicly readable");

  const escaped = await postJson({
    board: "match_discussion",
    title: "<b>HTML 제목</b>",
    body: "<img src=x onerror=alert(1)>",
  });
  assert.equal(escaped.response.status, 201);

  const escapedDetail = await getPage("/community/mock-created-2");
  assert.ok(escapedDetail.html.includes("&lt;b&gt;HTML 제목&lt;/b&gt;"));
  assert.ok(!escapedDetail.html.includes("<b>HTML 제목</b>"));
  assert.ok(escapedDetail.html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!escapedDetail.html.includes("<img src=x onerror=alert(1)>"));
  console.log("ok - HTML-like title and body are rendered as escaped text");

  const rateLimited = await postJson({
    board: "free",
    title: "세 번째 연속 등록",
    body: "연속 등록 제한 확인",
  });
  assert.equal(rateLimited.response.status, 429);
  assert.ok(Number(rateLimited.response.headers.get("retry-after")) > 0);
  assert.equal(createdCount, beforeInvalidPosts + 2, "rate-limited request must not insert rows");
  console.log("ok - consecutive anonymous posts are rate-limited in the server");

  for (const text of [...apiResponses, devLogs]) {
    assert.ok(!text.includes(TEST_SECRET), "test secret must not appear in responses or logs");
  }
  console.log("ok - the server key is not exposed in responses or dev-server logs");

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
