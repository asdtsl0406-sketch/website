"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatRating, formation, players, season } from "@/lib/data";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName, type FixturesResponse, type FootballTeam } from "@/lib/football-data";
import { communityBoards, communityExamples } from "@/lib/community-examples";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function CrestMark() {
  return <span className="crest-mark" aria-hidden="true"><Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized /></span>;
}

function TeamMark({ team }: { team: FootballTeam }) {
  if (team.id === 86) return <CrestMark />;
  return <span className="opponent-badge">{team.tla ?? team.shortName?.slice(0, 1) ?? team.name.slice(0, 1)}</span>;
}

function HomeContent() {
  const [fixturesData, setFixturesData] = useState<FixturesResponse>({ matches: [], recentResults: [] });
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadFixtures() {
      try {
        const response = await fetch("/api/fixtures");
        const payload = (await response.json()) as FixturesResponse & { error?: string };
        if (!response.ok) throw new Error("경기 일정을 불러올 수 없습니다.");
        if (!cancelled) {
          setFixturesData({ matches: payload.matches ?? [], recentResults: payload.recentResults ?? [] });
          setFixturesError(null);
        }
      } catch {
        if (!cancelled) setFixturesError("경기 일정을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    }
    void loadFixtures();
    return () => { cancelled = true; };
  }, []);

  const latestResult = fixturesData.recentResults[0] ?? null;
  const nextFixture = fixturesData.matches[0] ?? null;
  const bestPlayers = [...players].sort((a, b) => (b.seasonAverage ?? 0) - (a.seasonAverage ?? 0)).slice(0, 3);
  const previewGroups = [
    { label: "공격", roles: ["LW", "ST", "RW"] },
    { label: "중원", roles: ["CM", "CDM"] },
    { label: "수비", roles: ["LB", "CB", "RB"] },
    { label: "골키퍼", roles: ["GK"] },
  ];

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" id="home">
          <div className="hero-visual">
            <Image src="/images/bernabeu-hero.jpg" alt="팬들로 가득 찬 산티아고 베르나베우 경기장 내부" fill priority sizes="100vw" className="hero-image" />
            <div className="hero-shade" />
            <div className="hero-inner page-width">
              <div className="hero-copy">
                <div className="eyebrow light"><span /> MADRIDISTA · KOREA</div>
                <p className="hero-kicker">한국 팬을 위한 비공식 팬페이지</p>
                <h1>Hala<br /><em>Madrid.</em></h1>
                <p className="hero-description">다음 경기부터 베스트 11까지,<br />마드리디스타의 시선으로 함께합니다.</p>
                <div className="hero-actions">
                  <Link className="hero-button" href="/matches">다음 경기 보기 <Icon name="arrow" size={17} /></Link>
                  <Link className="hero-secondary" href="/community">팬라운지 둘러보기</Link>
                </div>
              </div>
            </div>
            <div className="image-credit">Photo: Zoser · cropped · <a href="https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg" target="_blank" rel="noreferrer">CC BY 4.0</a></div>
          </div>

          <div className="hero-match-wrap page-width">
            <div className="hero-match-card">
              <div className="match-card-top">
                <span className="live-label"><i /> {nextFixture ? competitionLabel(nextFixture.competitionCode, nextFixture.competitionName) : fixturesLoading ? "일정 조회 중" : "다음 경기"}</span>
                <span className="match-card-source">{nextFixture ? "NEXT MATCH" : fixturesError ? "API 확인" : "MADRIDISTA"}</span>
              </div>
              {nextFixture ? (
                <>
                  <div className="hero-fixture">
                    <div className="hero-team"><TeamMark team={nextFixture.homeTeam} /><span>{teamDisplayName(nextFixture.homeTeam)}</span></div>
                    <span className="versus">VS</span>
                    <div className="hero-team"><TeamMark team={nextFixture.awayTeam} /><span>{teamDisplayName(nextFixture.awayTeam)}</span></div>
                  </div>
                  <div className="match-card-divider" />
                  <div className="match-card-bottom">
                    <span><Icon name="calendar" size={16} /> {koreanDate(nextFixture.utcDate).dateLabel} · {koreanKickoff(nextFixture)}</span>
                    <span>{nextFixture.venue ?? (nextFixture.homeTeam.id === 86 ? "산티아고 베르나베우" : "원정 경기")}</span>
                  </div>
                </>
              ) : (
                <div className="hero-fixture-empty">{fixturesLoading ? "예정 경기를 불러오고 있어요." : fixturesError ?? "표시할 예정 경기가 없습니다."}</div>
              )}
            </div>
          </div>
        </section>

        <section className="home-results-section section-pad">
          <div className="page-width">
            <div className="home-section-heading">
              <div><div className="eyebrow"><span /> FULL TIME</div><h2>최근 <em>경기 결과</em></h2></div>
              <Link className="text-link" href="/matches">매치센터 <span aria-hidden="true">→</span></Link>
            </div>
            {fixturesLoading ? (
              <div className="home-empty">최근 경기 결과를 불러오는 중입니다.</div>
            ) : fixturesError ? (
              <div className="home-empty">{fixturesError}</div>
            ) : latestResult ? (
              <div className="results-editorial">
                <Link className="result-feature" href={`/matches/${latestResult.id}`}>
                  <div className="result-feature-top"><span>{competitionLabel(latestResult.competitionCode, latestResult.competitionName)}</span><span>{koreanDate(latestResult.utcDate).dateLabel}</span></div>
                  <div className="result-feature-score">
                    <span>{teamDisplayName(latestResult.homeTeam)}</span>
                    <strong>{latestResult.score?.home ?? "—"}<i>:</i>{latestResult.score?.away ?? "—"}</strong>
                    <span>{teamDisplayName(latestResult.awayTeam)}</span>
                  </div>
                  <div className="result-feature-bottom"><span>{latestResult.venue ?? "공식 경기 결과"}</span><span>경기 리뷰 보기 →</span></div>
                </Link>
                <div className="result-side-list">
                  {fixturesData.recentResults.slice(1, 5).map((match) => (
                    <Link className="result-row" href={`/matches/${match.id}`} key={match.id}>
                      <span className="result-row-date">{koreanDate(match.utcDate).dateLabel}</span>
                      <span className="result-row-teams">{teamDisplayName(match.homeTeam)} <b>{match.score?.home ?? "—"} : {match.score?.away ?? "—"}</b> {teamDisplayName(match.awayTeam)}</span>
                      <span className="result-row-comp">{competitionLabel(match.competitionCode, match.competitionName)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="home-empty">아직 표시할 최근 경기 결과가 없습니다.</div>
            )}
          </div>
        </section>

        <section className="home-xi-section section-pad">
          <div className="page-width">
            <div className="home-section-heading">
              <div><div className="eyebrow"><span /> THE STARTING XI</div><h2>이번 시즌의 <em>BEST 11</em></h2><p className="section-subtitle">{season} · {formation} · 시즌 평균 평점</p></div>
              <Link className="text-link" href="/matches#best11">매치센터에서 보기 <span aria-hidden="true">→</span></Link>
            </div>
            <div className="home-xi-preview">
              <div className="home-xi-formation"><span>FORMATION</span><strong>4<br /><i>3</i><br />3</strong><small>선수별 시즌 평균은<br />매치센터에서 확인하세요.</small></div>
              <div className="home-xi-lines">
                {previewGroups.map((group) => (
                  <div className="home-xi-line" key={group.label}>
                    <span className="home-xi-position">{group.label}</span>
                    <div>{players.filter((player) => group.roles.includes(player.position)).map((player) => (
                      <span className="home-xi-player" key={player.id}><b>{player.nameKr}</b><small>#{player.number}</small></span>
                    ))}</div>
                  </div>
                ))}
              </div>
              <div className="home-xi-leaders">
                <span className="panel-overline">SEASON AVERAGE LEADERS</span>
                {bestPlayers.map((player, index) => (
                  <div className="home-xi-leader" key={player.id}><span>0{index + 1}</span><b>{player.nameKr}</b><strong>{formatRating(player.seasonAverage)}</strong></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="home-community-section">
          <div className="page-width home-community-grid">
            <section className="home-lounge-panel">
              <div className="home-section-heading compact">
                <div><div className="eyebrow"><span /> FROM THE FAN LOUNGE</div><h2>팬라운지 <em>미리보기</em></h2></div>
                <Link className="text-link" href="/community">팬라운지 <span aria-hidden="true">→</span></Link>
              </div>
              <div className="home-post-list">
                {communityExamples.filter((post) => post.board === "free_chat").slice(0, 2).map((post) => (
                  <Link className="home-post-row" href={`/community/${post.id}`} key={post.id}>
                    <span className="board-label">예시 게시글 · {communityBoards.find((item) => item.id === post.board)?.label}</span>
                    <b>{post.title}</b>
                    <span className="home-post-meta">둘러보기용 예시</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="page-width about-inner">
            <div className="about-mark"><Icon name="calendar" size={22} /></div>
            <div><div className="eyebrow light"><span /> YOUR MATCH NOTE</div><h2>나만의 경기<br /><em>평점을 기록.</em></h2></div>
            <p>경기 종료 후 출전 명단이 확인된 선수에게 1~10점의 내 평점을 남길 수 있습니다. 평점은 이 브라우저에만 저장되며 다른 팬과 공유되지 않습니다.</p>
            <Link className="about-button" href="/matches">매치센터에서 참여 <Icon name="arrow" size={16} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export default function Home() {
  return <HomeContent />;
}
