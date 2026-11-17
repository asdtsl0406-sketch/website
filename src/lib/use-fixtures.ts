"use client";

import { useEffect, useState } from "react";
import type { FixturesResponse } from "@/lib/football-data";

const emptyFixtures: FixturesResponse = { matches: [], recentResults: [] };

export function useFixtures() {
  const [data, setData] = useState(emptyFixtures);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch("/api/fixtures", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as FixturesResponse;
        if (!response.ok || !Array.isArray(payload.matches) || !Array.isArray(payload.recentResults)) {
          throw new Error("fixture request failed");
        }
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) {
          setData(emptyFixtures);
          setError("경기 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [attempt]);

  return { data, loading, error, retry: () => setAttempt((value) => value + 1) };
}
