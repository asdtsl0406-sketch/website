export const scoutPositions = {
  goalkeeper: "골키퍼",
  defender: "수비수",
  midfielder: "미드필더",
  forward: "공격수",
} as const;

export const scoutProfiles = {
  youth: { label: "세대교체", range: "23세 이하", min: 15, max: 23 },
  prime: { label: "중간 연령대", range: "24–28세", min: 24, max: 28 },
  veteran: { label: "베테랑 연령대", range: "29세 이상", min: 29, max: 50 },
} as const;

export type ScoutPosition = keyof typeof scoutPositions;
export type ScoutProfile = keyof typeof scoutProfiles;
export type ScoutPlayer = { id: number; name: string; club: string; age: number };
export type ScoutResult = {
  players: ScoutPlayer[];
  scannedClubs: number;
  targetClubs: number;
};

export const scoutClubIds = [77, 78, 90, 92] as const;

type SquadMember = { id?: number; name?: string | null; position?: string | null; dateOfBirth?: string | null };
export type ScoutClub = { id: number; name: string; shortName?: string | null; squad: SquadMember[] };

function toScoutPosition(raw?: string | null): ScoutPosition | null {
  const position = raw?.trim().toLowerCase();
  if (!position) return null;
  if (position === "goalkeeper" || position === "keeper") return "goalkeeper";
  if (/defen[cs]|centre.back|center.back|left.back|right.back|full.back|wing.back/.test(position)) return "defender";
  if (position.includes("midfield")) return "midfielder";
  if (/offen[cs]|forward|winger|striker/.test(position)) return "forward";
  return null;
}

function ageAt(dateOfBirth: string | null | undefined, now: Date) {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== dateOfBirth) return null;
  return now.getUTCFullYear() - birth.getUTCFullYear()
    - Number(now.toISOString().slice(5, 10) < dateOfBirth.slice(5, 10));
}

export function shortlist(clubs: ScoutClub[], position: ScoutPosition, profile: ScoutProfile, now = new Date()): ScoutPlayer[] {
  const { min, max } = scoutProfiles[profile];
  const players = new Map<number, ScoutPlayer>();

  for (const club of clubs) {
    if (club.id === 86) continue;
    for (const player of club.squad) {
      if (!player.id || !player.name?.trim() || toScoutPosition(player.position) !== position) continue;
      const age = ageAt(player.dateOfBirth, now);
      if (age === null || age < min || age > max || players.has(player.id)) continue;
      players.set(player.id, { id: player.id, name: player.name.trim(), club: club.shortName || club.name, age });
    }
  }

  const ageOrder = profile === "veteran" ? -1 : 1;
  return [...players.values()]
    .sort((a, b) => ageOrder * (a.age - b.age) || a.name.localeCompare(b.name, "en") || a.id - b.id)
    .slice(0, 3);
}
