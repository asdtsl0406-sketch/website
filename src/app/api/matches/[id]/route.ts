import { NextResponse } from "next/server";
import { getMatchDetails } from "@/lib/match-details.server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMatchDetails(id);
  if (!result.ok) {
    return NextResponse.json({ error: "경기 정보를 불러오지 못했습니다." }, { status: result.status });
  }
  return NextResponse.json(result.match);
}
