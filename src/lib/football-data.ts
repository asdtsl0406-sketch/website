export type FootballTeam = { id: number; name: string; shortName?: string; tla?: string; crest?: string | null };
export type FullTimeScore = { home: number | null; away: number | null } | null;

export type FootballMatch = {
  id: string;
  utcDate: string;
  status: string;
  competitionCode: string;
  competitionName: string;
  venue: string | null;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score: FullTimeScore;
};

export type FixturesResponse = {
  matches: FootballMatch[];
  recentResults: FootballMatch[];
};

export type TeamMatch = Pick<FootballMatch, "homeTeam" | "awayTeam">;

export type AppearedPlayer = {
  playerId: string;
  playerName: string;
  teamId: number;
  shirtNumber: number | null;
  position: string | null;
};

export type MatchDetails = FootballMatch & {
  homeTeam: FootballTeam & { formation?: string | null };
  awayTeam: FootballTeam & { formation?: string | null };
  winner?: string | null;
  goals: Array<{
    minute: number | null;
    team: { id: number };
    scorer?: { name: string } | null;
    assist?: { name: string } | null;
  }>;
  appearedPlayers: AppearedPlayer[];
  ratingEnabled: boolean;
};

export function competitionLabel(code: string, fallback: string) {
  const labels: Record<string, string> = {
    PD: "LALIGA",
    CL: "CHAMPIONS LEAGUE",
    CDR: "COPA DEL REY",
  };
  return labels[code] ?? fallback.toUpperCase();
}

export function koreanDate(utcDate: string) {
  const date = new Date(utcDate);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "--";
  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "long",
  }).format(date);
  return { dateLabel: `${month}.${day}`, weekday };
}

export function koreanKickoff(match: Pick<FootballMatch, "status" | "utcDate">) {
  if (match.status !== "TIMED" && match.status !== "FINISHED") return "시간 미정";
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(match.utcDate));
  return `${time} KST`;
}

export function teamDisplayName(team: FootballTeam) {
  return team.id === 86 ? "REAL MADRID" : (team.shortName ?? team.name).toUpperCase();
}

export function realMadridHomeAway(match: TeamMatch) {
  if (match.homeTeam.id === 86) return "홈";
  if (match.awayTeam.id === 86) return "원정";
  return null;
}
