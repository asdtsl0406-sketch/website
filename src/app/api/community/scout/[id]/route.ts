import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/community-origin";
import { checkCommunityPostRateLimit } from "@/lib/community-rate-limit";
import { COMMUNITY_VISITOR_COOKIE, isCommunityVisitorId } from "@/lib/community-visitor";
import { isScoutPlayerId } from "@/lib/scout";
import { buildSupabaseHeaders, normalizeSupabaseValue } from "@/lib/supabase-headers";

const NO_STORE = { "Cache-Control": "no-store" };
const COLUMNS = "id,body,created_at";
type Context = { params: Promise<{ id: string }> };

function reply(body: object, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

async function requestComments(id: string, body?: string) {
  const url = normalizeSupabaseValue(process.env.SUPABASE_URL);
  const key = normalizeSupabaseValue(process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) return reply({ error: "선수 토론 저장소가 아직 연결되지 않았어요." }, 503);

  try {
    const endpoint = new URL(url.replace(/\/+$/, "") + "/rest/v1/scout_player_comments");
    endpoint.searchParams.set("select", COLUMNS);
    const headers = buildSupabaseHeaders(key);
    if (body === undefined) {
      endpoint.searchParams.set("player_id", "eq." + id);
      endpoint.searchParams.set("is_hidden", "eq.false");
      endpoint.searchParams.set("order", "created_at.desc,id.desc");
      endpoint.searchParams.set("limit", "30");
    } else {
      headers["Content-Type"] = "application/json";
      headers.Prefer = "return=representation";
    }
    const response = await fetch(endpoint, {
      headers, cache: "no-store", signal: AbortSignal.timeout(10000),
      method: body === undefined ? "GET" : "POST",
      body: body === undefined ? undefined : JSON.stringify({ player_id: Number(id), body }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null) as { code?: string } | null;
      if (failure?.code === "PGRST205" || failure?.code === "42P01") {
        return reply({ error: "선수 토론 저장소가 아직 준비되지 않았어요." }, 503);
      }
      return reply({ error: "선수 토론을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 502);
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || (body !== undefined && rows.length !== 1)) {
      return reply({ error: "선수 토론 응답을 읽지 못했어요." }, 502);
    }
    return body === undefined ? reply({ comments: rows }) : reply({ comment: rows[0] }, 201);
  } catch {
    return reply({ error: "선수 토론 저장소에 연결하지 못했어요." }, 502);
  }
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!isScoutPlayerId(id)) return reply({ error: "올바른 선수를 선택해 주세요." }, 400);
  return requestComments(id);
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  if (!isScoutPlayerId(id)) return reply({ error: "올바른 선수를 선택해 주세요." }, 400);
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameOriginRequest(origin, host)) return reply({ error: "요청을 처리할 수 없어요." }, 403);

  const visitor = (await cookies()).get(COMMUNITY_VISITOR_COOKIE)?.value;
  if (!isCommunityVisitorId(visitor)) return reply({ error: "창을 닫고 다시 열어 주세요." }, 400);

  const data: unknown = await request.json().catch(() => null);
  const input = data && typeof data === "object" && "body" in data ? data.body : undefined;
  const body = typeof input === "string" ? input.trim() : "";
  if (!body || body.length > 500 || body.includes("\0")) {
    return reply({ error: "의견은 1~500자로 입력해 주세요." }, 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim() || visitor;
  const rate = checkCommunityPostRateLimit("scout:" + ip);
  if (!rate.allowed) {
    return reply({ error: "의견을 너무 빠르게 등록했어요. 잠시 후 다시 시도해 주세요." }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }
  return requestComments(id, body);
}
