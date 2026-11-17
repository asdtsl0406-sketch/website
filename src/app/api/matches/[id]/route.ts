import { NextResponse } from "next/server";

type ProviderPlayer = {
  id?: number | string | null;
  name: string;
  position?: string | null;
  shirtNumber?: number | null;
};
type ProviderTeam = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  formation?: string | null;
  lineup?: ProviderPlayer[];
};
type ProviderMatch = {
  id: number;
  utcDate: string;
  status: string;
  venue?: string | null;
  competition: { code: string; name: string };
  homeTeam: ProviderTeam;
  awayTeam: ProviderTeam;
  score?: { winner?: string | null; fullTime?: { home: number | null; away: number | null } };
  goals?: Array<{ minute: number | null; team: { id: number }; scorer?: { name: string } | null; assist?: { name: string } | null }>;
  substitutions?: Array<{ team: { id: number }; playerIn?: ProviderPlayer | null }>;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json({ error: "경기 정보를 불러오지 못했습니다." }, { status: 503 });
  }

  try {
    const response = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(id)}`, {
      headers: {
        "X-Auth-Token": token,
        "X-Unfold-Lineups": "true",
        "X-Unfold-Subs": "true",
        "X-Unfold-Goals": "true",
      },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "경기 정보를 불러오지 못했습니다." }, { status: 502 });
    }

    const match = (await response.json()) as ProviderMatch;
    const participants = new Map<string, { playerId: string; playerName: string; teamId: number; shirtNumber: number | null; position: string | null }>();
    const addParticipant = (teamId: number, player: ProviderPlayer) => {
      if (player.id === undefined || player.id === null) return;
      const playerId = String(player.id);
      participants.set(playerId, {
        playerId,
        playerName: player.name,
        teamId,
        shirtNumber: player.shirtNumber ?? null,
        position: player.position ?? null,
      });
    };

    for (const player of match.homeTeam.lineup ?? []) addParticipant(match.homeTeam.id, player);
    for (const player of match.awayTeam.lineup ?? []) addParticipant(match.awayTeam.id, player);
    for (const substitution of match.substitutions ?? []) {
      if (substitution.playerIn) addParticipant(substitution.team.id, substitution.playerIn);
    }

    const appearedPlayers = [...participants.values()];

    return NextResponse.json({
      id: String(match.id),
      utcDate: match.utcDate,
      status: match.status,
      venue: match.venue ?? null,
      competitionCode: match.competition.code,
      competitionName: match.competition.name,
      homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name, shortName: match.homeTeam.shortName, tla: match.homeTeam.tla, formation: match.homeTeam.formation },
      awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name, shortName: match.awayTeam.shortName, tla: match.awayTeam.tla, formation: match.awayTeam.formation },
      score: match.score?.fullTime ?? null,
      winner: match.score?.winner ?? null,
      goals: match.goals ?? [],
      appearedPlayers,
      ratingEnabled: match.status === "FINISHED" && appearedPlayers.length > 0,
    });
  } catch {
    return NextResponse.json({ error: "경기 정보를 불러오지 못했습니다." }, { status: 502 });
  }
}
