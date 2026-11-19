import { NextResponse } from "next/server";
import {
  availableScoutRoles, isScoutRoleOption, realMadridClubId, scoutLeagueOptions, scoutLeagues, scoutPositions, shortlist,
  type ScoutClub, type ScoutLeague, type ScoutPosition, type ScoutResult,
} from "@/lib/scout";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedPosition = params.get("position");
  const role = params.get("role") ?? "all";
  const league = params.get("league") ?? "PD";
  if (!requestedPosition || !Object.hasOwn(scoutPositions, requestedPosition)) {
    return NextResponse.json({ error: "보강 포지션을 다시 선택해 주세요." }, { status: 400 });
  }
  const position = requestedPosition as ScoutPosition;
  if (!isScoutRoleOption(position, role)) {
    return NextResponse.json({ error: "보강 포지션에 맞는 세부 포지션을 선택해 주세요." }, { status: 400 });
  }
  if (!Object.hasOwn(scoutLeagueOptions, league)) {
    return NextResponse.json({ error: "리그를 다시 선택해 주세요." }, { status: 400 });
  }

  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json({ error: "선수 데이터 연결이 설정되지 않았어요." }, { status: 503 });
  }

  const leagues = league === "all" ? Object.keys(scoutLeagues) as ScoutLeague[] : [league as ScoutLeague];
  const results = await Promise.allSettled(leagues.map(async (code) => {
    const response = await fetch(`https://api.football-data.org/v4/competitions/${code}/teams`, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("League unavailable");
    const { teams } = await response.json() as { teams?: ScoutClub[] };
    if (!Array.isArray(teams) || !teams.length) throw new Error("Invalid league data");
    return teams.map(team => ({ ...team, league: code }));
  }));

  const unavailableLeagues = leagues.filter((_, index) => results[index].status === "rejected");
  const teams = results
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .filter((club) => club.id !== realMadridClubId);
  const clubs = teams.filter((club) => typeof club.name === "string" && Array.isArray(club.squad) && club.squad.length > 0);
  if (!clubs.length) {
    return NextResponse.json({ error: "구단 명단을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }

  const data: ScoutResult = {
    players: shortlist(clubs, position, role),
    scannedClubs: clubs.length,
    targetClubs: teams.length,
    unavailableLeagues,
    availableRoles: availableScoutRoles(clubs, position),
  };
  return NextResponse.json(data);
}
