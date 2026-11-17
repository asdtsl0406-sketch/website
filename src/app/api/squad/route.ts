import { NextResponse } from "next/server";
import squadData from "@/data/real-madrid-2026-27.json";

type ProviderPlayer = {
  id?: number | string;
  name?: string | null;
  position?: string | null;
  shirtNumber?: number | null;
  nationality?: string | null;
};

type SquadPosition = "골키퍼" | "수비수" | "미드필더" | "공격수";

const existingPlayerNamesById: Record<string, string> = {
  "3641": "Thibaut Courtois",
  "7867": "Trent Alexander-Arnold",
  "9542": "Ibrahima Konate",
  "191727": "Dean Huijsen",
  "182020": "Alvaro Carreras",
  "8514": "Aurelien Tchouameni",
  "125010": "Jude Bellingham",
  "96": "Federico Valverde",
  "169162": "Arda Guler",
  "1556": "Vinicius Junior",
  "3374": "Kylian Mbappe",
};

const additionalKoreanNamesById: Record<string, string> = {
  "28995": "안드리 루닌",
  "1337": "에데르 밀리탕",
  "3177": "안토니오 뤼디거",
  "7417": "덴젤 둠프리스",
  "8458": "페를랑 멘디",
  "15863": "마르크 쿠쿠레야",
  "3254": "베르나르두 실바",
  "102343": "에두아르도 카마빙가",
  "283110": "티아고 피타르치",
  "289908": "호르헤 세스테로",
  "1324": "호드리구",
  "7887": "브라힘 디아스",
  "188487": "엔드릭",
  "247061": "카를로스 에스피",
  "277484": "얀 디오만데",
  "302640": "일리야 볼로신",
};

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function mapPosition(position?: string | null): SquadPosition | null {
  switch (position?.trim().toLowerCase()) {
    case "goalkeeper":
      return "골키퍼";
    case "defence":
    case "defense":
      return "수비수";
    case "midfield":
      return "미드필더";
    case "offence":
    case "offense":
      return "공격수";
    default:
      return null;
  }
}

export async function GET() {
  const token = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!token) {
    return NextResponse.json({ error: "선수단 정보를 불러오지 못했어요" }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.football-data.org/v4/teams/86", {
      headers: { "X-Auth-Token": token },
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "선수단 정보를 불러오지 못했어요" }, { status: 502 });
    }

    const payload = await response.json() as { squad?: ProviderPlayer[] };
    if (!Array.isArray(payload.squad)) {
      return NextResponse.json({ error: "선수단 정보를 불러오지 못했어요" }, { status: 502 });
    }

    const koreanNames = new Map(squadData.players.map((player) => [normalizeName(player.name), player.nameKr]));
    const squad = payload.squad.flatMap((player) => {
      const apiName = player.name?.trim();
      if (!apiName) return [];
      const id = player.id === undefined ? undefined : String(player.id);
      const existingName = id ? existingPlayerNamesById[id] : undefined;
      const name = (id ? additionalKoreanNamesById[id] : undefined)
        ?? (existingName ? koreanNames.get(normalizeName(existingName)) : undefined)
        ?? koreanNames.get(normalizeName(apiName))
        ?? apiName;

      const shirtNumber = typeof player.shirtNumber === "number" && Number.isFinite(player.shirtNumber)
        ? player.shirtNumber
        : undefined;
      const nationality = player.nationality?.trim() || undefined;

      return [{
        id: id ?? apiName,
        name,
        searchName: apiName,
        position: mapPosition(player.position),
        ...(shirtNumber === undefined ? {} : { shirtNumber }),
        ...(nationality ? { nationality } : {}),
      }];
    });

    return NextResponse.json({ squad });
  } catch {
    return NextResponse.json({ error: "선수단 정보를 불러오지 못했어요" }, { status: 502 });
  }
}
