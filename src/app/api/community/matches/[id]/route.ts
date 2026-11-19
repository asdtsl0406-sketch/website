import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/community-origin";
import { checkCommunityPostRateLimit } from "@/lib/community-rate-limit";
import { COMMUNITY_VISITOR_COOKIE, isCommunityVisitorId } from "@/lib/community-visitor";
import { hashCommunityVisitorId } from "@/lib/community-visitor.server";
import { getMatchDetails } from "@/lib/match-details.server";
import { isMadridMatch, isMatchLoungeId, matchLoungeBodyLimit, mvpCandidates } from "@/lib/match-lounge";
import { buildSupabaseHeaders, normalizeSupabaseValue } from "@/lib/supabase-headers";

type Context = { params: Promise<{ id: string }> };

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function getVisitor() {
  const value = (await cookies()).get(COMMUNITY_VISITOR_COOKIE)?.value;
  return isCommunityVisitorId(value) ? hashCommunityVisitorId(value) : null;
}

async function store(id: string, visitor: string | null, entry?: { playerId: string | null; body: string | null }) {
  const url = normalizeSupabaseValue(process.env.SUPABASE_URL);
  const key = normalizeSupabaseValue(process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) return reply({ error: "경기 토론 저장소가 아직 연결되지 않았어요." }, 503);
  const base = url.replace(/\/+$/, "") + "/rest/v1/rpc/";
  const headers = { ...buildSupabaseHeaders(key), "Content-Type": "application/json" };
  const params = { p_match_id: Number(id), p_voter_hash: visitor };
  const endpoint = entry ? "write_community_match" : "read_community_match";

  try {
    const response = await fetch(base + endpoint, {
      method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(8000),
      body: JSON.stringify(entry ? { ...params, p_player_id: entry.playerId, p_body: entry.body } : params),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { code?: string } | null;
      if (data?.code === "PGRST202" || data?.code === "PGRST205" || data?.code === "42P01") {
        return reply({ error: "경기 토론을 아직 열 수 없어요. 저장소 설정이 필요해요." }, 503);
      }
      return reply({ error: "경기 토론을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
    }
    return entry ? reply({ ok: true }, 201) : reply(await response.json());
  } catch {
    return reply({ error: "경기 토론 저장소에 연결하지 못했어요." }, 502);
  }
}

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!isMatchLoungeId(id)) return reply({ error: "올바른 경기를 선택해 주세요." }, 400);
  return store(id, await getVisitor());
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameOriginRequest(origin, host)) return reply({ error: "요청을 처리할 수 없어요." }, 403);
  if (!isMatchLoungeId(id)) return reply({ error: "올바른 경기를 선택해 주세요." }, 400);
  const visitor = await getVisitor();
  if (!visitor) return reply({ error: "페이지를 새로고침하고 다시 시도해 주세요." }, 400);
  const data: unknown = await request.json().catch(() => null);
  if (!data || typeof data !== "object" || !("type" in data) || (data.type !== "comment" && data.type !== "vote")) {
    return reply({ error: "요청 형식을 확인해 주세요." }, 400);
  }
  const body = "body" in data && typeof data.body === "string" ? data.body.trim() : "";
  if (body.length > matchLoungeBodyLimit || body.includes("\0") || (data.type === "comment" && !body)) {
    return reply({ error: "의견은 1~500자로 입력해 주세요." }, 400);
  }
  const playerId = data.type === "vote" && "playerId" in data && typeof data.playerId === "string" ? data.playerId : null;
  if (data.type === "vote" && (!playerId || !isMatchLoungeId(playerId))) {
    return reply({ error: "MVP 후보를 선택해 주세요." }, 400);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim() || visitor;
  if (!checkCommunityPostRateLimit("match-lounge:" + ip).allowed) {
    return reply({ error: "너무 빠르게 등록했어요. 잠시 후 다시 시도해 주세요." }, 429);
  }
  const details = await getMatchDetails(id);
  if (!details.ok) return reply({ error: "경기 정보를 확인하지 못했어요." }, details.status);
  if (!isMadridMatch(details.match)) return reply({ error: "레알 마드리드 경기만 토론을 열 수 있어요." }, 404);
  if (playerId && !mvpCandidates(details.match).some(player => player.playerId === playerId)) {
    return reply({ error: "종료된 경기의 실제 레알 마드리드 출전 선수에게만 투표할 수 있어요." }, 400);
  }
  return store(id, visitor, { playerId, body: body || null });
}
