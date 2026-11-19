"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName } from "@/lib/football-data";
import { pickFeaturedMatch } from "@/lib/match-lounge";
import { useFixtures } from "@/lib/use-fixtures";
import styles from "./community.module.css";

export function CommunityMatchCard() {
  const { data, loading, error } = useFixtures();
  const [mode, setMode] = useState<"before" | "after" | null>(null);
  const upcoming = data.matches[0];
  const latest = data.recentResults[0];
  const defaultMatch = pickFeaturedMatch(upcoming, latest);
  const match = (mode === "before" ? upcoming : mode === "after" ? latest : defaultMatch) ?? defaultMatch;
  if (!match) {
    return (
      <section className={styles.matchCard} aria-label="경기 토론">
        <small>매치 라운지</small>
        <p role="status">{loading ? "경기 일정을 확인하고 있어요." : error ? "지금은 경기 정보를 불러올 수 없어요." : "지금은 연결할 경기가 없어요."}</p>
        {!loading && <Link href="/matches">매치센터 보기 ↗</Link>}
      </section>
    );
  }
  const finished = match.status === "FINISHED";
  const date = koreanDate(match.utcDate);

  return (
    <section className={styles.matchCard} aria-labelledby="community-match-heading">
      <div className={styles.matchCopy}>
        <div className={styles.matchModes}>
          <small>매치 라운지</small>
          {upcoming && latest && (
            <div role="group" aria-label="경기 선택">
              <button type="button" aria-pressed={!finished} onClick={() => setMode("before")}>다음 경기</button>
              <button type="button" aria-pressed={finished} onClick={() => setMode("after")}>최근 경기</button>
            </div>
          )}
        </div>
        <h2 id="community-match-heading">{teamDisplayName(match.homeTeam)}
          <span>{finished ? `${match.score?.home ?? "–"} : ${match.score?.away ?? "–"}` : "vs"}</span>
          {teamDisplayName(match.awayTeam)}
        </h2>
        <p>{competitionLabel(match.competitionCode, match.competitionName)} · {date.dateLabel} {finished ? "경기 종료" : koreanKickoff(match)}</p>
        <Link className={styles.matchLink} href={`/community/matches/${match.id}`}>
          {finished ? "경기 후 토론 · MVP 투표" : "경기 전 토론"} <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <span className={styles.matchSticker} aria-hidden="true"><Image
        src="/images/home/real-reaction-triptych.webp" alt="" fill sizes="240px" /></span>
    </section>
  );
}
