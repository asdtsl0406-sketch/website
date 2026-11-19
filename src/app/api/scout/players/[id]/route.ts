import { NextResponse } from "next/server";
import { isScoutPlayerId, scoutLeagues, type ScoutMatchStats } from "@/lib/scout";

type PersonMatches = {
  person?: { id?: number };
  resultSet?: { count?: number; first?: string; last?: string };
  aggregations?: { matchesOnPitch?: unknown; startingXI?: unknown; minutesPlayed?: unknown };
  matches?: { competition?: { code?: string } }[];
};

function readCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = new URL(request.url).searchParams.get("league");
  if (!isScoutPlayerId(id) || !league || !Object.hasOwn(scoutLeagues, league)) {
    return NextResponse.json({ stats: null }, { status: 400 });
  }
  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) return NextResponse.json({ stats: null });

  try {
    const url = new URL(`https://api.football-data.org/v4/persons/${id}/matches`);
    url.search = new URLSearchParams({ competitions: league, limit: "100" }).toString();
    const response = await fetch(url, {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return NextResponse.json({ stats: null });
    const payload = await response.json() as PersonMatches;
    const appearances = readCount(payload.aggregations?.matchesOnPitch);
    const starts = readCount(payload.aggregations?.startingXI);
    const minutes = readCount(payload.aggregations?.minutesPlayed);
    const count = payload.resultSet?.count;
    if (payload.person?.id !== Number(id) || !Array.isArray(payload.matches)
      || count !== payload.matches.length || count === 0 || count >= 100
      || payload.matches.some(match => match.competition?.code !== league)
      || appearances === null || appearances === 0 || appearances > count
      || starts === null || starts > appearances || minutes === null || minutes === 0) {
      return NextResponse.json({ stats: null });
    }
    const stats: ScoutMatchStats = {
      appearances, starts, minutes,
      first: readDate(payload.resultSet?.first), last: readDate(payload.resultSet?.last),
    };
    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ stats: null });
  }
}
