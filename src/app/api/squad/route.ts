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

      const shirtNumber = typeof player.shirtNumber === "number" && Number.isFinite(player.shirtNumber)
        ? player.shirtNumber
        : undefined;
      const nationality = player.nationality?.trim() || undefined;

      return [{
        id: player.id === undefined ? apiName : String(player.id),
        name: koreanNames.get(normalizeName(apiName)) ?? apiName,
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
