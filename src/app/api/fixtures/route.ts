import { NextResponse } from "next/server";

const REAL_MADRID_ID = 86;
const SUPPORTED_COMPETITIONS = new Set(["PD", "CL", "CDR"]);

type Team = { id: number; name: string; shortName?: string; tla?: string };
type Match = {
  id: number;
  utcDate: string;
  status: string;
  venue?: string | null;
  competition: { code: string; name: string };
  homeTeam: Team;
  awayTeam: Team;
  score?: { fullTime?: { home: number | null; away: number | null } };
};

export async function GET() {
  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY를 .env.local 또는 배포 환경변수에 설정하세요." },
      { status: 503 },
    );
  }

  const now = Date.now();
  const dateFrom = new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateTo = new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = new URL(`https://api.football-data.org/v4/teams/${REAL_MADRID_ID}/matches`);
  url.searchParams.set("dateFrom", dateFrom);
  url.searchParams.set("dateTo", dateTo);
  url.searchParams.set("limit", "100");

  try {
    const response = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      const error = response.status === 400 || response.status === 403
        ? "API 키가 유효하지 않거나 해당 대회가 현재 플랜에 포함되지 않습니다."
        : response.status === 429
          ? "football-data.org 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요."
          : "football-data.org에서 경기 일정을 가져오지 못했습니다.";
      return NextResponse.json({ error }, { status: 502 });
    }

    const payload = (await response.json()) as { matches?: Match[] };
    const coveredMatches = (payload.matches ?? []).filter((match) =>
      SUPPORTED_COMPETITIONS.has(match.competition.code),
    );
    const toFixture = (match: Match) => ({
      id: String(match.id),
      utcDate: match.utcDate,
      status: match.status,
      competitionCode: match.competition.code,
      competitionName: match.competition.name,
      venue: match.venue ?? null,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      score: match.score?.fullTime ?? null,
    });
    const matches = coveredMatches
      .filter((match) => match.status === "SCHEDULED" || match.status === "TIMED")
      .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
      .slice(0, 8)
      .map(toFixture);
    const recentResults = coveredMatches
      .filter((match) => match.status === "FINISHED")
      .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate))
      .slice(0, 5)
      .map(toFixture);

    return NextResponse.json({ matches, recentResults, source: "football-data.org" });
  } catch {
    return NextResponse.json(
      { error: "일정 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요." },
      { status: 502 },
    );
  }
}
