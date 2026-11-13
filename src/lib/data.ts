import squadData from "@/data/real-madrid-2026-27.json";

type SquadPlayer = (typeof squadData.players)[number];

export type Player = SquadPlayer & {
  id: string;
  number: number;
  shortName: string;
  role: string;
  x: number;
  y: number;
};

const shirtNumbers: Record<string, number> = {
  "Thibaut Courtois": 1,
  "Trent Alexander-Arnold": 12,
  "Ibrahima Konate": 16,
  "Dean Huijsen": 4,
  "Alvaro Carreras": 18,
  "Aurelien Tchouameni": 14,
  "Jude Bellingham": 5,
  "Federico Valverde": 8,
  "Arda Guler": 15,
  "Vinicius Junior": 7,
  "Kylian Mbappe": 10,
};

const playerIds: Record<string, string> = {
  "Thibaut Courtois": "courtois",
  "Trent Alexander-Arnold": "trent",
  "Ibrahima Konate": "konate",
  "Dean Huijsen": "huijsen",
  "Alvaro Carreras": "carreras",
  "Aurelien Tchouameni": "tchouameni",
  "Jude Bellingham": "bellingham",
  "Federico Valverde": "valverde",
  "Arda Guler": "guler",
  "Vinicius Junior": "vinicius",
  "Kylian Mbappe": "mbappe",
};

const KoreanShortNames: Record<string, string> = {
  "Thibaut Courtois": "쿠르투아",
  "Trent Alexander-Arnold": "트렌트",
  "Ibrahima Konate": "코나테",
  "Dean Huijsen": "하위선",
  "Alvaro Carreras": "카레라스",
  "Aurelien Tchouameni": "추아메니",
  "Jude Bellingham": "벨링엄",
  "Federico Valverde": "발베르데",
  "Arda Guler": "귈러",
  "Vinicius Junior": "비니시우스",
  "Kylian Mbappe": "음바페",
};

const roleNames: Record<string, string> = {
  GK: "골키퍼",
  RB: "라이트백",
  CB: "센터백",
  LB: "레프트백",
  CDM: "수비형 미드필더",
  CM: "중앙 미드필더",
  RW: "라이트 윙어",
  LW: "레프트 윙어",
  ST: "센터 포워드",
};

const formationSlots: Record<string, { x: number; y: number }> = {
  "Thibaut Courtois": { x: 50, y: 91 },
  "Trent Alexander-Arnold": { x: 88, y: 72 },
  "Ibrahima Konate": { x: 63, y: 75 },
  "Dean Huijsen": { x: 37, y: 75 },
  "Alvaro Carreras": { x: 12, y: 72 },
  "Aurelien Tchouameni": { x: 50, y: 57 },
  "Jude Bellingham": { x: 25, y: 51 },
  "Federico Valverde": { x: 75, y: 51 },
  "Arda Guler": { x: 78, y: 27 },
  "Vinicius Junior": { x: 22, y: 27 },
  "Kylian Mbappe": { x: 50, y: 19 },
};

export const season = squadData.season;
export const formation = squadData.formation;

export const players: Player[] = squadData.players.map((player) => ({
  ...player,
  id: playerIds[player.name],
  number: shirtNumbers[player.name],
  shortName: KoreanShortNames[player.name],
  role: roleNames[player.position],
  ...formationSlots[player.name],
}));

export const fixtures = [
  {
    id: "fixture-1",
    date: "11.22",
    weekday: "일요일",
    competition: "LALIGA",
    opponent: "Athletic Club",
    opponentShort: "ATH",
    venue: "Santiago Bernabéu",
  },
  {
    id: "fixture-2",
    date: "11.25",
    weekday: "수요일",
    competition: "CHAMPIONS LEAGUE",
    opponent: "Liverpool",
    opponentShort: "LIV",
    venue: "Anfield",
  },
  {
    id: "fixture-3",
    date: "11.29",
    weekday: "일요일",
    competition: "LALIGA",
    opponent: "Getafe",
    opponentShort: "GET",
    venue: "Santiago Bernabéu",
  },
];

export function formatRating(rating: number | null) {
  return rating === null ? "—" : rating.toFixed(2);
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
