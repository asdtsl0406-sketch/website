import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hideOwnedCommunityPost } from "@/lib/community-repository.server";
import { isSameOriginRequest } from "@/lib/community-origin";
import { COMMUNITY_VISITOR_COOKIE, isCommunityVisitorId } from "@/lib/community-visitor";
import { hashCommunityVisitorId } from "@/lib/community-visitor.server";
import { SUPABASE_NETWORK_MESSAGES } from "@/lib/supabase-failure";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isSameOriginRequest(origin, host)) {
    return NextResponse.json(
      { ok: false, error: "요청을 처리할 수 없습니다." },
      { status: 403, headers: NO_STORE },
    );
  }

  const visitorId = (await cookies()).get(COMMUNITY_VISITOR_COOKIE)?.value;
  if (!isCommunityVisitorId(visitorId)) {
    return NextResponse.json(
      { ok: false, error: "브라우저 식별 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요." },
      { status: 400, headers: NO_STORE },
    );
  }

  const { id } = await params;
  if (!id || id.length > 100) {
    return NextResponse.json(
      { ok: false, error: "게시글을 찾을 수 없습니다." },
      { status: 404, headers: NO_STORE },
    );
  }

  const result = await hideOwnedCommunityPost(id, hashCommunityVisitorId(visitorId));

  if (result.ok) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (result.reason === "forbidden") {
    // Same answer for missing posts and other people's posts on purpose.
    return NextResponse.json(
      { ok: false, error: "이 글을 삭제할 수 없습니다." },
      { status: 403, headers: NO_STORE },
    );
  }

  if (result.reason === "not_configured") {
    return NextResponse.json(
      { ok: false, error: "서버에 Supabase 설정이 없어 글을 삭제할 수 없습니다." },
      { status: 503, headers: NO_STORE },
    );
  }

  if (result.reason === "network") {
    const networkReason = result.networkReason ?? "unknown";
    return NextResponse.json(
      {
        ok: false,
        error: SUPABASE_NETWORK_MESSAGES[networkReason],
        diagnostic: { networkReason, supabaseHost: result.networkHost ?? null },
      },
      { status: 502, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { ok: false, error: "글을 삭제하지 못했습니다. 다시 시도해 주세요." },
    { status: 502, headers: NO_STORE },
  );
}
