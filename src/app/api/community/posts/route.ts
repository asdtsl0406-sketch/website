import { NextResponse } from "next/server";
import { validateCommunityPostInput } from "@/lib/community-posts";
import { checkCommunityPostRateLimit } from "@/lib/community-rate-limit";
import { createCommunityPost } from "@/lib/community-repository.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedKey = forwarded?.split(",")[0]?.trim();
  return forwardedKey || request.headers.get("x-real-ip")?.trim() || "anonymous";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "요청 형식이 올바르지 않습니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const validation = validateCommunityPostInput(payload);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "입력 내용을 확인해주세요.",
        fieldErrors: validation.errors,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rateLimit = checkCommunityPostRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "글을 너무 빠르게 연속 등록했습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const result = await createCommunityPost(validation.value);
  if (!result.ok) {
    if (result.reason === "not_configured") {
      return NextResponse.json(
        {
          ok: false,
          error: "서버에 SUPABASE_URL과 SUPABASE_SECRET_KEY가 설정되지 않아 글을 저장할 수 없습니다.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: result.status === 401
          ? "Supabase 인증에 실패했습니다. Vercel의 SUPABASE_SECRET_KEY가 서버용 secret 키인지 확인해주세요."
          : result.status === 403
            ? "Supabase 저장 권한이 없습니다. SUPABASE_SECRET_KEY가 secret/service_role 키인지 확인해주세요."
            : result.status === 404
              ? "SUPABASE_URL이 올바른지 확인해주세요. 주소 끝에 /rest/v1을 붙이면 안 됩니다."
              : result.status === 400
                ? "게시글 저장 형식이 데이터베이스와 맞지 않습니다. posts 테이블의 컬럼과 제약조건을 확인해주세요."
                : "글을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
        diagnostic: {
          supabaseStatus: result.status ?? null,
          supabaseCode: result.code ?? null,
        },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
