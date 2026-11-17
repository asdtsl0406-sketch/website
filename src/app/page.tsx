"use client";

import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BestElevenPitch } from "@/components/best-eleven-pitch";
import { TeamMark } from "@/components/team-mark";
import { competitionLabel, koreanDate, koreanKickoff, realMadridHomeAway, teamDisplayName } from "@/lib/football-data";
import { communityBoards, communityExamples } from "@/lib/community-examples";
import { useFixtures } from "@/lib/use-fixtures";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function HomeContent() {
  const { data: fixturesData, loading: fixturesLoading, error: fixturesError, retry } = useFixtures();
  const latestResult = fixturesData.recentResults[0] ?? null;
  const nextFixture = fixturesData.matches[0] ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" id="home">
          <div className="hero-match-wrap page-width">
            <div className="hero-match-card">
              <div className="match-card-top">
                <span className="live-label"><i /> {nextFixture ? competitionLabel(nextFixture.competitionCode, nextFixture.competitionName) : "다음 경기"}</span>
                <span className="match-card-source">한국 시간 기준</span>
              </div>
              {fixturesError ? (
                <div className="hero-fixture-empty">
                  <span>{fixturesError}</span>
                  <button className="retry-button light-retry" type="button" onClick={retry}>다시 시도</button>
                </div>
              ) : nextFixture ? (
                <>
                  <div className="hero-fixture">
                    <div className="hero-team"><TeamMark team={nextFixture.homeTeam} /><span>{teamDisplayName(nextFixture.homeTeam)}</span></div>
                    <span className="versus">VS</span>
                    <div className="hero-team"><TeamMark team={nextFixture.awayTeam} /><span>{teamDisplayName(nextFixture.awayTeam)}</span></div>
                  </div>
                  <div className="match-card-divider" />
                  <div className="match-card-bottom">
                    <span><Icon name="calendar" size={16} /> {koreanDate(nextFixture.utcDate).dateLabel} · {koreanKickoff(nextFixture)}</span>
                    <span>{realMadridHomeAway(nextFixture)}{nextFixture.venue ? ` · ${nextFixture.venue}` : ""}</span>
                  </div>
                </>
              ) : (
                <div className="hero-fixture-empty">{fixturesLoading ? "예정 경기를 불러오는 중입니다." : "예정된 경기 일정이 없습니다."}</div>
              )}
            </div>
          </div>
          <div className="hero-visual">
            <Image src="/images/bernabeu-hero.jpg" alt="팬들로 가득 찬 산티아고 베르나베우 경기장 내부" fill priority sizes="100vw" className="hero-image" />
            <div className="hero-shade" />
            <div className="hero-inner page-width">
              <div className="hero-copy">
                <div className="eyebrow light"><span /> MADRIDISTA · KOREA</div>
                <p className="hero-kicker">한국 팬을 위한 비공식 팬페이지</p>
                <h1>Hala<br /><em>Madrid.</em></h1>
                <p className="hero-description">경기 일정과 결과를 확인하고,<br />마드리디스타의 이야기를 둘러보세요.</p>
                <div className="hero-actions">
                  <Link className="hero-button" href="/matches">경기 일정 보기 <Icon name="arrow" size={17} /></Link>
                  <Link className="hero-secondary" href="/community">팬 커뮤니티 둘러보기</Link>
                </div>
              </div>
            </div>
            <div className="image-credit">Photo: Zoser · cropped · <a href="https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg" target="_blank" rel="noreferrer">CC BY 4.0</a></div>
          </div>

        </section>

        <section className="home-results-section section-pad">
          <div className="page-width">
            <div className="home-section-heading">
              <div><h2>최근 경기 결과</h2></div>
              <Link className="text-link" href="/matches">경기 결과 더 보기 <span aria-hidden="true">→</span></Link>
            </div>
            {fixturesLoading ? (
              <div className="home-empty">최근 경기 결과를 불러오는 중입니다.</div>
            ) : fixturesError ? (
              <div className="home-empty">
                <span>{fixturesError}</span>
                <button className="retry-button" type="button" onClick={retry}>다시 시도</button>
              </div>
            ) : latestResult ? (
              <div className="results-editorial">
                <Link className="result-feature" href={`/matches/${latestResult.id}`}>
                  <div className="result-feature-top"><span>{competitionLabel(latestResult.competitionCode, latestResult.competitionName)}</span><span>{koreanDate(latestResult.utcDate).dateLabel}</span></div>
                  <div className="result-feature-score">
                    <span className="result-feature-team"><TeamMark team={latestResult.homeTeam} /><b>{teamDisplayName(latestResult.homeTeam)}</b></span>
                    <strong>{latestResult.score?.home ?? "—"}<i>:</i>{latestResult.score?.away ?? "—"}</strong>
                    <span className="result-feature-team away"><TeamMark team={latestResult.awayTeam} /><b>{teamDisplayName(latestResult.awayTeam)}</b></span>
                  </div>
                  <div className="result-feature-bottom"><span>{realMadridHomeAway(latestResult) ?? "종료된 경기"}</span><span>경기 상세 보기 →</span></div>
                </Link>
                <div className="result-side-list">
                  {fixturesData.recentResults.slice(1, 5).map((match) => (
                    <Link className="result-row" href={`/matches/${match.id}`} key={match.id}>
                      <span className="result-row-date">{koreanDate(match.utcDate).dateLabel}</span>
                      <span className="result-row-teams">
                        <span className="result-row-team"><TeamMark team={match.homeTeam} /><b>{teamDisplayName(match.homeTeam)}</b></span>
                        <strong>{match.score?.home ?? "—"} : {match.score?.away ?? "—"}</strong>
                        <span className="result-row-team away"><TeamMark team={match.awayTeam} /><b>{teamDisplayName(match.awayTeam)}</b></span>
                      </span>
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

        <section className="home-xi-section section-pad page-width">
          <BestElevenPitch />
        </section>

        <section className="home-community-section">
          <div className="page-width home-community-grid">
            <section className="home-lounge-panel">
              <div className="home-section-heading compact">
                <div><div className="eyebrow"><span /> FROM THE FAN COMMUNITY</div><h2>팬 커뮤니티 <em>미리보기</em></h2></div>
                <Link className="text-link" href="/community">팬 커뮤니티 둘러보기 <span aria-hidden="true">→</span></Link>
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
            <Link className="about-button" href="/matches">경기 일정 보기 <Icon name="arrow" size={16} /></Link>
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
