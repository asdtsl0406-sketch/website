import type { FootballMatch, MatchDetails } from "@/lib/football-data";

export const matchLoungeBodyLimit = 500;

export type MatchLoungeComment = { id: number; body: string; player_id: string | null; created_at: string };
export type MatchLoungeState = {
  myVote: string | null;
  votes: Record<string, number>;
  comments: MatchLoungeComment[];
};

export function isMatchLoungeId(id: string) {
  return /^[1-9]\d{0,9}$/.test(id);
}

export function isMadridMatch(match: FootballMatch) {
  return match.homeTeam.id === 86 || match.awayTeam.id === 86;
}

export function mvpCandidates(match: MatchDetails) {
  if (match.status !== "FINISHED" || !isMadridMatch(match)) return [];
  return match.appearedPlayers.filter(player =>
    player.teamId === 86 && isMatchLoungeId(player.playerId) && player.playerName?.trim());
}

export function pickFeaturedMatch(upcoming: FootballMatch | undefined, latest: FootballMatch | undefined, now = Date.now()) {
  const elapsed = latest ? now - Date.parse(latest.utcDate) : Infinity;
  return latest && elapsed >= 0 && elapsed < 30 * 60 * 60 * 1000 ? latest : upcoming ?? latest;
}
