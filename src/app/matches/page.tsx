"use client";

import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BestElevenPitch } from "@/components/best-eleven-pitch";
import { TeamMark } from "@/components/team-mark";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName, type FootballMatch } from "@/lib/football-data";
import { useFixtures } from "@/lib/use-fixtures";

function MatchRow({ match, result = false }: { match: FootballMatch; result?: boolean }) {
  const { dateLabel, weekday } = koreanDate(match.utcDate);
  return (
    <Link className={`match-list-row ${result ? "is-result" : ""}`} href={`/matches/${match.id}`}>
      <span className="match-row-date"><strong>{dateLabel}</strong><small>{weekday}</small></span>
      <span className="match-row-competition">{competitionLabel(match.competitionCode, match.competitionName)}</span>
      <span className="match-row-teams">
        <span className="match-row-team"><TeamMark team={match.homeTeam} /><b>{teamDisplayName(match.homeTeam)}</b><small>홈</small></span>
        <strong className="match-row-score">{result ? `${match.score?.home ?? "—"} : ${match.score?.away ?? "—"}` : "VS"}</strong>
        <span className="match-row-team away"><TeamMark team={match.awayTeam} /><b>{teamDisplayName(match.awayTeam)}</b><small>원정</small></span>
      </span>
      <span className="match-row-time">{result ? "경기 상세 →" : koreanKickoff(match)}</span>
    </Link>
  );
}

export default function MatchesPage() {
  const { data, loading, error, retry } = useFixtures();

  return (
    <>
      <SiteHeader />
      <main className="inner-page matches-page">
        <div className="page-width">
          <header className="inner-page-heading">
            <div className="eyebrow"><span /> 매치센터</div>
            <h1>매치센터</h1>
            <p>경기 일정과 결과를 확인하세요. 경기 시간은 한국 시간 기준입니다.</p>
          </header>

          <section className="match-list-section" aria-labelledby="upcoming-title">
            <div className="match-list-heading"><div><div className="eyebrow"><span /> 한국 시간 기준</div><h2 id="upcoming-title">경기 일정</h2></div><span className="schedule-source">football-data.org</span></div>
            {loading ? <div className="page-state">경기 일정을 불러오는 중입니다.</div> : error ? <div className="page-state error">{error} <button className="retry-button" type="button" onClick={retry}>다시 시도</button></div> : data.matches.length ? data.matches.map((match) => <MatchRow key={match.id} match={match} />) : <div className="page-state">표시할 경기 일정이 없습니다.</div>}
          </section>

          <section className="match-list-section results-list-section" aria-labelledby="results-title">
            <div className="match-list-heading"><div><div className="eyebrow"><span /> 경기 결과</div><h2 id="results-title">최근 경기 결과</h2></div><span className="results-caption">표시된 스코어는 종료된 경기만 포함합니다</span></div>
            {loading ? <div className="page-state">최근 경기 결과를 불러오는 중입니다.</div> : error ? <div className="page-state error">{error} <button className="retry-button" type="button" onClick={retry}>다시 시도</button></div> : data.recentResults.length ? data.recentResults.map((match) => <MatchRow key={match.id} match={match} result />) : <div className="page-state">표시할 최근 경기 결과가 없습니다.</div>}
          </section>

          <section className="matches-best11" id="best11">
            <BestElevenPitch />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
