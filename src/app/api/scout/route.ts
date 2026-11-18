import { NextResponse } from "next/server";
import {
  scoutClubIds, scoutPositions, scoutProfiles, shortlist,
  type ScoutClub, type ScoutPosition, type ScoutProfile, type ScoutResult,
} from "@/lib/scout";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const position = params.get("position");
  const profile = params.get("profile");
  if (!position || !Object.hasOwn(scoutPositions, position) || !profile || !Object.hasOwn(scoutProfiles, profile)) {
    return NextResponse.json({ error: "포지션과 영입 기준을 다시 선택해 주세요." }, { status: 400 });
  }

  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json({ error: "선수 데이터 연결이 설정되지 않았어요." }, { status: 503 });
  }

  const results = await Promise.allSettled(scoutClubIds.map(async (id) => {
    const response = await fetch(`https://api.football-data.org/v4/teams/${id}`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Squad unavailable");
    const club = await response.json() as ScoutClub;
    if (club.id !== id || typeof club.name !== "string" || !Array.isArray(club.squad) || !club.squad.length) {
      throw new Error("Invalid squad data");
    }
    return club;
  }));

  const clubs = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!clubs.length) {
    return NextResponse.json({ error: "구단 명단을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }

  const data: ScoutResult = {
    players: shortlist(clubs, position as ScoutPosition, profile as ScoutProfile),
    scannedClubs: clubs.length,
    targetClubs: scoutClubIds.length,
  };
  return NextResponse.json(data);
}
