"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatRating, formation, players } from "@/lib/data";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName, type FixturesResponse, type FootballMatch, type FootballTeam } from "@/lib/football-data";

function CrestMark() {
  return <span className="crest-mark" aria-hidden="true"><Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized /></span>;
}

function TeamMark({ team }: { team: FootballTeam }) {
  if (team.id === 86) return <CrestMark />;
  return <span className="opponent-badge">{team.tla ?? team.shortName?.slice(0, 1) ?? team.name.slice(0, 1)}</span>;
}

function MatchRow({ match, result = false }: { match: FootballMatch; result?: boolean }) {
  const { dateLabel, weekday } = koreanDate(match.utcDate);
  return (
    <Link className={`match-list-row ${result ? "is-result" : ""}`} href={`/matches/${match.id}`}>
      <span className="match-row-date"><strong>{dateLabel}</strong><small>{weekday}</small></span>
      <span className="match-row-competition">{competitionLabel(match.competitionCode, match.competitionName)}</span>
      <span className="match-row-teams">
        <span className="match-row-team"><TeamMark team={match.homeTeam} /><b>{teamDisplayName(match.homeTeam)}</b></span>
        <strong className="match-row-score">{result ? `${match.score?.home ?? "—"} : ${match.score?.away ?? "—"}` : "VS"}</strong>
        <span className="match-row-team away"><TeamMark team={match.awayTeam} /><b>{teamDisplayName(match.awayTeam)}</b></span>
      </span>
      <span className="match-row-time">{result ? "경기 리뷰 →" : koreanKickoff(match)}</span>
    </Link>
  );
}

export default function MatchesPage() {
  const [data, setData] = useState<FixturesResponse>({ matches: [], recentResults: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/fixtures")
      .then(async (response) => {
        const payload = (await response.json()) as FixturesResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "경기 정보를 불러오지 못했습니다.");
        if (active) setData({ matches: payload.matches ?? [], recentResults: payload.recentResults ?? [] });
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "경기 정보를 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const grouped = [
    { label: "GK", players: players.filter((player) => player.position === "GK") },
    { label: "DEF", players: players.filter((player) => ["RB", "CB", "LB"].includes(player.position)) },
    { label: "MID", players: players.filter((player) => ["CDM", "CM"].includes(player.position)) },
    { label: "FWD", players: players.filter((player) => ["RW", "LW", "ST"].includes(player.position)) },
  ];

  return (
    <>
      <SiteHeader />
      <main className="inner-page matches-page">
        <div className="page-width">
          <header className="inner-page-heading">
            <div className="eyebrow"><span /> MATCHDAY DESK</div>
            <h1>매치센터</h1>
            <p>일정부터 경기 리뷰까지, 레알마드리드의 다음 장면을 확인하세요.</p>
          </header>

          <section className="match-list-section" aria-labelledby="upcoming-title">
            <div className="match-list-heading"><div><div className="eyebrow"><span /> NEXT FIXTURES</div><h2 id="upcoming-title">예정 경기</h2></div><span className="schedule-source">football-data.org</span></div>
            {loading ? <div className="page-state">경기 일정을 불러오는 중입니다.</div> : error ? <div className="page-state error">{error}</div> : data.matches.length ? data.matches.map((match) => <MatchRow key={match.id} match={match} />) : <div className="page-state">현재 확인 가능한 예정 경기가 없습니다.</div>}
          </section>

          <section className="match-list-section results-list-section" aria-labelledby="results-title">
            <div className="match-list-heading"><div><div className="eyebrow"><span /> FINAL WHISTLE</div><h2 id="results-title">최근 결과</h2></div><span className="results-caption">경기 상세에서 선수 평점에 참여</span></div>
            {loading ? <div className="page-state">결과를 불러오는 중입니다.</div> : error ? <div className="page-state error">{error}</div> : data.recentResults.length ? data.recentResults.map((match) => <MatchRow key={match.id} match={match} result />) : <div className="page-state">최근 경기 결과가 아직 없습니다.</div>}
          </section>

          <section className="matches-best11" id="best11" aria-labelledby="best-eleven-title">
            <div className="match-list-heading"><div><div className="eyebrow"><span /> SEASON FORMATION</div><h2 id="best-eleven-title">시즌 평균 기반 베스트 11</h2><p>시즌 평균 평점과 경기별 팬 평점은 별도 지표입니다.</p></div><span className="formation-chip">{formation}</span></div>
            <div className="matches-xi-layout">
              <div className="pitch-wrap desktop-xi-pitch">
                <div className="pitch-label"><span>FORMATION</span><strong>{formation.replaceAll("-", " — ")}</strong></div>
                <div className="pitch" role="group" aria-label={`${formation} 포메이션 선수 배치`}>
                  <div className="pitch-stripe stripe-one" /><div className="pitch-stripe stripe-two" /><div className="pitch-stripe stripe-three" />
                  <div className="pitch-line halfway" /><div className="pitch-circle" />
                  <div className="pitch-box top-box" /><div className="pitch-box bottom-box" />
                  <div className="pitch-goal top-goal" /><div className="pitch-goal bottom-goal" />
                  {players.map((player) => (
                    <div className="pitch-player" key={player.id} style={{ left: `${player.x}%`, top: `${player.y}%` }}>
                      <span className={`player-rating ${player.seasonAverage === null ? "unrated" : ""}`}>{formatRating(player.seasonAverage)}</span>
                      <span className="player-shirt">{player.number}</span>
                      <span className="player-name">{player.shortName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="xi-roster-list">
                {grouped.map((group) => (
                  <div className="xi-roster-line" key={group.label}>
                    <span>{group.label}</span>
                    <div>{group.players.map((player) => <span className="xi-roster-player" key={player.id}><b>#{player.number}</b>{player.nameKr}<small>{formatRating(player.seasonAverage)}</small></span>)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
