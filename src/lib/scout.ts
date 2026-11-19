export const scoutPositions = {
  goalkeeper: "골키퍼",
  defender: "수비수",
  midfielder: "미드필더",
  forward: "공격수",
} as const;

const scoutRoles = {
  centreBack: { label: "센터백", names: ["centre back", "center back", "central defender"] },
  leftBack: { label: "왼쪽 풀백", names: ["left back", "left full back", "left fullback"] },
  rightBack: { label: "오른쪽 풀백", names: ["right back", "right full back", "right fullback"] },
  defensiveMidfield: { label: "수비형 미드필더", names: ["defensive midfield", "defensive midfielder"] },
  centralMidfield: { label: "중앙 미드필더", names: ["central midfield", "central midfielder", "centre midfield", "center midfield"] },
  attackingMidfield: { label: "공격형 미드필더", names: ["attacking midfield", "attacking midfielder"] },
  leftWinger: { label: "왼쪽 윙어", names: ["left winger", "left wing"] },
  rightWinger: { label: "오른쪽 윙어", names: ["right winger", "right wing"] },
  centreForward: { label: "중앙 공격수", names: ["centre forward", "center forward", "central forward", "striker"] },
} as const;

export const scoutRolesByPosition = {
  goalkeeper: [],
  defender: ["centreBack", "leftBack", "rightBack"],
  midfielder: ["defensiveMidfield", "centralMidfield", "attackingMidfield"],
  forward: ["leftWinger", "rightWinger", "centreForward"],
} as const satisfies Record<ScoutPosition, readonly ScoutRole[]>;

export const scoutLeagues = {
  PD: "라리가",
  PL: "프리미어리그",
  BL1: "분데스리가",
  SA: "세리에 A",
  FL1: "리그 1",
} as const;

export const scoutLeagueOptions = { ...scoutLeagues, all: "유럽 5대 리그 전체" } as const;
export const realMadridClubId = 86;
export type ScoutLeague = keyof typeof scoutLeagues;
export type ScoutLeagueOption = keyof typeof scoutLeagueOptions;
export type ScoutPosition = keyof typeof scoutPositions;
export type ScoutRole = keyof typeof scoutRoles;
export type ScoutRoleOption = ScoutRole | "all";
export type ScoutPlayer = {
  id: number;
  name: string;
  club: string;
  age: number | null;
  role: ScoutRole | null;
  league?: ScoutLeague;
  nationality?: string;
  shirtNumber?: number;
  contractUntil?: string;
};
export type ScoutResult = {
  players: ScoutPlayer[];
  scannedClubs: number;
  targetClubs: number;
  unavailableLeagues: ScoutLeague[];
  availableRoles: ScoutRole[];
};

export type ScoutMatchStats = { appearances: number; starts: number; minutes: number; first: string | null; last: string | null };

type SquadMember = {
  id?: number; name?: string | null; position?: string | null; dateOfBirth?: string | null;
  nationality?: string | null; shirtNumber?: number | null; contract?: { until?: string | null } | null;
};
export type ScoutClub = { id: number; name: string; shortName?: string | null; squad: SquadMember[]; league?: ScoutLeague };

export function scoutRoleLabel(role: ScoutRoleOption) {
  return role === "all" ? "전체" : scoutRoles[role].label;
}

export function isScoutRoleOption(position: ScoutPosition, role: string): role is ScoutRoleOption {
  return role === "all" || scoutRolesByPosition[position].some(option => option === role);
}

function toScoutPosition(position: string): ScoutPosition | null {
  if (position === "goalkeeper" || position === "keeper") return "goalkeeper";
  if (/defen[cds]|cent(?:re|er) back|left back|right back|full ?back|wing ?back/.test(position)) return "defender";
  if (position.includes("midfield")) return "midfielder";
  if (/offen[cs]|forward|winger|striker|^(left|right) wing$/.test(position)) return "forward";
  return null;
}

function normalizePosition(raw?: string | null) {
  return raw?.trim().toLowerCase().replace(/[-\s]+/g, " ") ?? "";
}

function getScoutRole(position: ScoutPosition, rawPosition: string) {
  return scoutRolesByPosition[position].find(option => scoutRoles[option].names.some(name => name === rawPosition));
}

export function availableScoutRoles(clubs: ScoutClub[], position: ScoutPosition): ScoutRole[] {
  const roles = new Set<ScoutRole>();
  for (const club of clubs) {
    if (club.id === realMadridClubId) continue;
    for (const player of club.squad) {
      if (!player.id || !player.name?.trim()) continue;
      const role = getScoutRole(position, normalizePosition(player.position));
      if (role) roles.add(role);
    }
  }
  return scoutRolesByPosition[position].filter(role => roles.has(role));
}

export function isScoutPlayerId(id: string) {
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647;
}

function ageAt(dateOfBirth: string | null | undefined, now: Date) {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(dateOfBirth)) return null;
  const date = dateOfBirth.slice(0, 10);
  const birth = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== date || birth > now) return null;
  return now.getUTCFullYear() - birth.getUTCFullYear()
    - Number(now.toISOString().slice(5, 10) < date.slice(5, 10));
}

export function shortlist(clubs: ScoutClub[], position: ScoutPosition, role: ScoutRoleOption, now = new Date()): ScoutPlayer[] {
  const players = new Map<number, ScoutPlayer>();

  for (const club of clubs) {
    if (club.id === realMadridClubId) continue;
    for (const player of club.squad) {
      if (!player.id || !player.name?.trim() || players.has(player.id)) continue;
      const rawPosition = normalizePosition(player.position);
      const detail = getScoutRole(position, rawPosition);
      if (!detail && toScoutPosition(rawPosition) !== position) continue;
      if (role !== "all" && detail !== role) continue;
      players.set(player.id, {
        id: player.id, name: player.name.trim(), club: club.shortName || club.name,
        age: ageAt(player.dateOfBirth, now), role: detail ?? null,
        league: club.league,
        nationality: player.nationality?.trim() || undefined,
        shirtNumber: typeof player.shirtNumber === "number" && Number.isInteger(player.shirtNumber) && player.shirtNumber > 0 ? player.shirtNumber : undefined,
        contractUntil: player.contract?.until && /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(player.contract.until) ? player.contract.until : undefined,
      });
    }
  }

  return [...players.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "en") || a.id - b.id)
    .slice(0, 3);
}
