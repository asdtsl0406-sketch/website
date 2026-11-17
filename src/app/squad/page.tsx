"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import styles from "./squad.module.css";

type Position = "골키퍼" | "수비수" | "미드필더" | "공격수";
type SquadPlayer = {
  id: string;
  name: string;
  searchName: string;
  position: Position | null;
  shirtNumber?: number;
  nationality?: string;
};
type LoadState = "loading" | "error" | "ready";

const filters: Array<{ label: string; position: Position | null }> = [
  { label: "전체", position: null },
  { label: "골키퍼", position: "골키퍼" },
  { label: "수비수", position: "수비수" },
  { label: "미드필더", position: "미드필더" },
  { label: "공격수", position: "공격수" },
];

const positionOrder: Position[] = ["골키퍼", "수비수", "미드필더", "공격수"];

export default function SquadPage() {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState("loading");

    fetch("/api/squad", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { squad?: SquadPlayer[] };
        if (!response.ok || !Array.isArray(payload.squad)) throw new Error("Squad request failed");
        if (active) {
          setSquad(payload.squad);
          setState("ready");
        }
      })
      .catch(() => { if (active) setState("error"); });

    return () => { active = false; };
  }, [attempt]);

  const filteredPlayers = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return squad.filter((player) => {
      const matchesPosition = selectedPosition === null || player.position === selectedPosition;
      const matchesSearch = !search || `${player.name} ${player.searchName}`.toLocaleLowerCase().includes(search);
      return matchesPosition && matchesSearch;
    });
  }, [squad, selectedPosition, query]);

  const groups = selectedPosition
    ? [{ label: selectedPosition, players: filteredPlayers }]
    : [
        ...positionOrder.map((position) => ({
          label: position,
          players: filteredPlayers.filter((player) => player.position === position),
        })),
        { label: "포지션 미확인", players: filteredPlayers.filter((player) => player.position === null) },
      ].filter((group) => group.players.length > 0);

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className="page-width">
          <header className={styles.heading}>
            <h1>레알 마드리드 선수단</h1>
          </header>

          <div className={styles.controls}>
            <div className={styles.filters} aria-label="포지션 필터">
              {filters.map((filter) => (
                <button
                  className={`${styles.filter} ${selectedPosition === filter.position ? styles.selected : ""}`}
                  type="button"
                  key={filter.label}
                  aria-pressed={selectedPosition === filter.position}
                  onClick={() => setSelectedPosition(filter.position)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <span className={styles.srOnly}>선수 이름 검색</span>
              <input
                type="search"
                value={query}
                placeholder="선수 이름 검색"
                onChange={(event) => setQuery(event.target.value)}
              />
              <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
            </label>
          </div>

          {state === "loading" ? (
            <p className={styles.status} role="status">선수단 정보를 불러오는 중입니다.</p>
          ) : state === "error" ? (
            <div className={styles.status} role="alert">
              <span>선수단 정보를 불러오지 못했어요</span>
              <button className={styles.retry} type="button" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button>
            </div>
          ) : squad.length === 0 ? (
            <p className={styles.status}>선수단 데이터가 없습니다.</p>
          ) : filteredPlayers.length === 0 ? (
            <p className={styles.status} role="status">
              {query.trim() ? "검색 조건에 맞는 선수가 없어요" : "이 포지션의 선수 데이터가 없습니다."}
            </p>
          ) : (
            <div className={styles.groups}>
              {groups.map((group) => (
                <section className={styles.group} key={group.label} aria-labelledby={`squad-${group.label}`}>
                  <h2 id={`squad-${group.label}`}>{group.label}</h2>
                  <div className={styles.players}>
                    {group.players.map((player) => (
                      <article className={styles.player} key={player.id}>
                        {player.shirtNumber !== undefined && <span className={styles.number}>{player.shirtNumber}</span>}
                        <div className={styles.playerInfo}>
                          <h3>{player.name}</h3>
                          {player.nationality && <p>{player.nationality}</p>}
                        </div>
                        <span className={styles.position}>{player.position ?? "포지션 미확인"}</span>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
