"use client";

import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BestElevenPitch } from "@/components/best-eleven-pitch";
import { HomePlayerRatings } from "@/components/home-player-ratings";
import { TeamMark } from "@/components/team-mark";
import { competitionLabel, koreanDate, koreanKickoff, realMadridHomeAway, teamDisplayName } from "@/lib/football-data";
import { communityBoards, communityExamples } from "@/lib/community-examples";
import { useFixtures } from "@/lib/use-fixtures";
import { HomeHeroActions } from "./home-hero-actions";
import styles from "./home-hero.module.css";

const archivePhotos = [
  {
    src: "/images/home/archive-ronaldo-2012.jpg",
    alt: "흰 레알 마드리드 유니폼을 입은 크리스티아누 호날두의 정면 모습",
    title: "레알 유니폼의 호날두",
    detail: "2012년 여름 친선 경기",
    source: "https://commons.wikimedia.org/wiki/File:Cristiano_Ronaldo,_2012_2.JPG",
    credit: "goatling", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  {
    src: "/images/home/archive-madrid-2018.jpg",
    alt: "2018년 챔피언스리그 우승 축하 행사에서 웃고 있는 호날두와 마르셀루, 옆의 벤제마",
    title: "우승 다음 날",
    detail: "호날두·벤제마·마르셀루 · 2018",
    source: "https://commons.wikimedia.org/wiki/File:La_alcaldesa_recibe_al_Real_Madrid,_campe%C3%B3n_una_vez_m%C3%A1s_de_la_Champions_League_17.jpg",
    credit: "Diario de Madrid", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    src: "/images/home/archive-marcelo-2022.jpg",
    alt: "2022년 레알 마드리드 우승 축하 행사에서 활짝 웃는 마르셀루",
    title: "웃음 못 숨기는 마르셀루",
    detail: "리그·챔피언스리그 우승 행사 · 2022",
    source: "https://commons.wikimedia.org/wiki/File:Ofrenda_de_la_Liga_y_la_Champions-55-L.Mill%C3%A1n_(52109278836)_(cropped).jpg",
    credit: "Fotografías Archimadrid.es", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
];

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
      <main className={styles.homeMain}>
        <section className={styles.hero} id="home">
          <div className={`page-width ${styles.heroInner}`}>
            <div className={styles.copy}>
              <div className="eyebrow"><span /> MADRIDISTA · KOREA</div>
              <h1>Hala <em>Madrid.</em></h1>
              <p className={styles.description}>경기 일정과 결과를 확인하고,<br />마드리디스타의 이야기를 둘러보세요.</p>
            </div>
            <figure className={styles.reactionSheet}>
              <div className={styles.art}>
                <Image src="/images/home/real-reaction-triptych.webp"
                  alt="레알 마드리드 흰 유니폼을 입고 익살스러운 표정을 짓는 비니시우스와 음바페, 분홍 유니폼을 입고 놀란 표정의 벨링엄"
                  width={2172} height={724} priority sizes="(max-width: 1236px) 96vw, 1180px" />
              </div>
              <ul className={styles.playerLabels} aria-label="사진 속 선수">
                <li>비니시우스</li>
                <li>음바페</li>
                <li>벨링엄</li>
              </ul>
              <figcaption>AI로 만든 팬아트</figcaption>
            </figure>
            <HomeHeroActions />
          </div>
          <div className={`page-width ${styles.fixtureWrap}`}>
            <div className={`hero-match-card ${styles.fixtureCard}`}>
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
          <BestElevenPitch englishPositions />
        </section>

        <section className={`page-width ${styles.archive}`} aria-labelledby="home-archive-title">
          <h2 id="home-archive-title">레알 사진첩</h2>
          <ul className={styles.albumGrid}>
            {archivePhotos.map(photo => (
              <li key={photo.src}>
                <figure className={styles.albumCard}>
                  <a href={photo.src} target="_blank" rel="noreferrer" className={styles.albumImage}
                    aria-label={`${photo.title} 사진 크게 보기 (새 탭)`}>
                    <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 620px) 92vw, 370px" />
                  </a>
                  <figcaption>
                    <strong>{photo.title}</strong>
                    <p>{photo.detail}</p>
                    <small><a href={photo.source}>{photo.credit}</a> · <a href={photo.licenseUrl}>{photo.license}</a></small>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
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
          <HomePlayerRatings
            matches={fixturesData.recentResults}
            matchesLoading={fixturesLoading}
            matchesError={fixturesError}
            onRetry={retry}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export default function Home() {
  return <HomeContent />;
}
