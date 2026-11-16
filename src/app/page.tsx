"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { average, formatRating, formation, players, season } from "@/lib/data";

type VoteMap = Record<string, number[]>;
type FixtureTeam = { id: number; name: string; shortName?: string; tla?: string };
type Fixture = {
  id: string;
  utcDate: string;
  status: "SCHEDULED" | "TIMED";
  competitionCode: string;
  competitionName: string;
  venue: string | null;
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
};

function formatFixtureDate(utcDate: string) {
  const date = new Date(utcDate);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value ?? "--";
  const day = parts.find((part) => part.type === "day")?.value ?? "--";
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "long",
  }).format(date);
  return { dateLabel: `${month}.${day}`, weekday };
}

function formatKickoff(fixture: Fixture) {
  if (fixture.status !== "TIMED") return "시간 미정";
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(fixture.utcDate));
  return `${time} KST`;
}

function getCompetitionLabel(fixture: Fixture) {
  const labels: Record<string, string> = {
    PD: "LALIGA",
    CL: "CHAMPIONS LEAGUE",
    CDR: "COPA DEL REY",
  };
  return labels[fixture.competitionCode] ?? fixture.competitionName.toUpperCase();
}

function TeamMark({ team }: { team: FixtureTeam }) {
  if (team.id === 86) return <CrestMark />;
  return <span className="opponent-badge">{team.tla ?? team.shortName?.slice(0, 1) ?? team.name.slice(0, 1)}</span>;
}

function teamDisplayName(team: FixtureTeam) {
  return team.id === 86 ? "REAL MADRID" : (team.shortName ?? team.name).toUpperCase();
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }
  if (name === "star") {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="m12 2.8 2.83 5.73 6.32.92-4.57 4.45 1.08 6.29L12 17.22l-5.66 2.97 1.08-6.29L2.85 9.45l6.32-.92L12 2.8Z" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    );
  }
  if (name === "menu") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function CrestMark() {
  return (
    <span className="crest-mark" aria-hidden="true">
      <Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" />
    </span>
  );
}

export default function Home() {
  const [votes, setVotes] = useState<VoteMap>({});
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("madridista-fan-votes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as VoteMap;
        const playerIds = new Set(players.map((player) => player.id));
        const currentVotes = Object.fromEntries(
          Object.entries(parsed).filter(([playerId]) => playerIds.has(playerId)),
        );
        setVotes(currentVotes);
        window.localStorage.setItem("madridista-fan-votes", JSON.stringify(currentVotes));
      } catch {
        window.localStorage.removeItem("madridista-fan-votes");
      }
    }
  }, []);

  useEffect(() => {
    const sections = ["home", "schedule", "lineup", "about"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-96px 0px -58% 0px", threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFixtures() {
      try {
        const response = await fetch("/api/fixtures");
        const payload = (await response.json()) as { matches?: Fixture[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "경기 일정을 불러오지 못했습니다.");
        if (!cancelled) {
          setFixtures(payload.matches ?? []);
          setFixturesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setFixturesError(error instanceof Error ? error.message : "경기 일정을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    }

    void loadFixtures();
    return () => { cancelled = true; };
  }, []);

  const selected = players.find((player) => player.id === selectedPlayer) ?? null;
  const nextFixture = fixtures[0] ?? null;
  const topRated = useMemo(
    () =>
      players
        .filter((player) => player.seasonAverage !== null)
        .sort((a, b) => (b.seasonAverage ?? 0) - (a.seasonAverage ?? 0))
        .slice(0, 3),
    [],
  );

  function submitVote() {
    if (!selectedPlayer || selectedScore === null) return;
    const nextVotes = {
      ...votes,
      [selectedPlayer]: [selectedScore],
    };
    setVotes(nextVotes);
    window.localStorage.setItem("madridista-fan-votes", JSON.stringify(nextVotes));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
    setSelectedScore(null);
  }

  function fanAverage(playerId: string) {
    const entries = votes[playerId] ?? [];
    return entries.length ? average(entries) : null;
  }

  const navItems = [
    { id: "home", label: "홈" },
    { id: "lineup", label: "베스트 11" },
    { id: "schedule", label: "경기 일정" },
    { id: "about", label: "팬 평점 안내" },
  ];

  return (
    <main>
      <div className="announcement">한국 마드리디스타를 위한 비공식 팬 매치데이 매거진</div>

      <header className="site-header">
        <div className="site-header-inner page-width">
          <a className="brand" href="#home" aria-label="Madridista 홈" onClick={() => setActiveSection("home")}>
            <CrestMark />
            <span className="brand-copy"><strong>MADRIDISTA</strong><small>FAN CLUB · KOREA</small></span>
          </a>
          <nav className={`main-nav ${mobileMenuOpen ? "is-open" : ""}`} id="main-navigation" aria-label="메인 메뉴">
            {navItems.map((item) => (
              <a
                className={activeSection === item.id ? "active" : ""}
                href={`#${item.id}`}
                key={item.id}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            className="menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileMenuOpen}
            aria-controls="main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} size={21} />
          </button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-visual">
          <Image
            src="/images/bernabeu-hero.jpg"
            alt="팬들로 가득 찬 산티아고 베르나베우 경기장 내부"
            fill
            priority
            sizes="100vw"
            className="hero-image"
          />
          <div className="hero-shade" />
          <div className="hero-inner page-width">
            <div className="hero-copy">
              <div className="eyebrow light"><span /> MADRIDISTA · KOREA</div>
              <p className="hero-kicker">한국 팬을 위한 비공식 팬페이지</p>
              <h1>Hala<br /><em>Madrid.</em></h1>
              <p className="hero-description">
                다음 경기부터 베스트 11까지,<br />
                마드리디스타의 시선으로 함께합니다.
              </p>
              <div className="hero-actions">
                <a className="hero-button" href="#schedule">다음 경기 보기 <Icon name="arrow" size={17} /></a>
                <a className="hero-secondary" href="#lineup">베스트 11 보기</a>
              </div>
            </div>
          </div>
          <div className="image-credit">
            Photo: Zoser · cropped · <a href="https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg" target="_blank" rel="noreferrer">CC BY 4.0</a>
          </div>
        </div>

        <div className="hero-match-wrap page-width">
          <div className="hero-match-card">
            <div className="match-card-top">
              <span className="live-label"><i /> {nextFixture ? getCompetitionLabel(nextFixture) : fixturesLoading ? "일정 조회 중" : "다음 경기"}</span>
              <span className="match-card-source">{nextFixture ? "NEXT MATCH" : fixturesError ? "API 연결 확인" : "MADRIDISTA"}</span>
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
                  <span><Icon name="calendar" size={16} /> {formatFixtureDate(nextFixture.utcDate).dateLabel} · {formatKickoff(nextFixture)}</span>
                  <span>{nextFixture.venue ?? (nextFixture.homeTeam.id === 86 ? "산티아고 베르나베우" : "원정 경기")}</span>
                </div>
              </>
            ) : (
              <div className="hero-fixture-empty">
                {fixturesLoading ? "예정 경기를 불러오고 있어요." : fixturesError ?? "표시할 예정 경기가 없습니다."}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="schedule-section section-pad" id="schedule">
        <div className="page-width">
          <div className="schedule-heading">
            <div>
              <div className="eyebrow"><span /> THE ROAD AHEAD</div>
              <h2>다음 <em>경기 일정</em></h2>
            </div>
            <span className="schedule-source">football-data.org</span>
          </div>
          <div className="fixture-grid">
            {fixturesLoading && <div className="fixture-state">경기 일정을 불러오는 중입니다.</div>}
            {!fixturesLoading && fixturesError && <div className="fixture-state fixture-error">{fixturesError}</div>}
            {!fixturesLoading && !fixturesError && fixtures.length === 0 && <div className="fixture-state">현재 표시할 예정 경기가 없습니다.</div>}
            {!fixturesLoading && !fixturesError && fixtures.map((fixture, index) => {
              const { dateLabel, weekday } = formatFixtureDate(fixture.utcDate);
              const isHome = fixture.homeTeam.id === 86;
              return (
                <article className={`fixture-card ${index === 0 ? "featured-fixture" : ""}`} key={fixture.id}>
                  <div className="fixture-date"><strong>{dateLabel}</strong><small>{weekday}</small></div>
                  <div className="fixture-competition"><b>{getCompetitionLabel(fixture)}</b><small>{formatKickoff(fixture)}</small></div>
                  <div className="fixture-teams">
                    <div className={`fixture-club ${fixture.homeTeam.id === 86 ? "" : "opponent"}`}><TeamMark team={fixture.homeTeam} /><span>{teamDisplayName(fixture.homeTeam)}</span></div>
                    <span className="fixture-vs">VS</span>
                    <div className={`fixture-club ${fixture.awayTeam.id === 86 ? "" : "opponent"}`}><TeamMark team={fixture.awayTeam} /><span>{teamDisplayName(fixture.awayTeam)}</span></div>
                  </div>
                  <div className="fixture-venue"><span>{fixture.venue ?? (isHome ? "산티아고 베르나베우" : "원정 경기")}</span><small>{isHome ? "HOME" : "AWAY"}</small></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lineup-section section-pad" id="lineup">
        <div className="page-width">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span /> MATCHDAY · FAN RATINGS</div>
              <h2>팬이 선택한 <em>BEST 11</em></h2>
              <p className="section-subtitle">{season} 시즌 · {formation} 포메이션</p>
            </div>
            <div className="rating-legend">
              <span className="legend-star"><Icon name="star" size={15} /></span>
              <span><b>{season} 시즌 평균</b><small>SEASON AVERAGE</small></span>
            </div>
          </div>

          <div className="lineup-layout">
            <div className="pitch-wrap">
              <div className="pitch-label"><span>FORMATION</span><strong>{formation.replaceAll("-", " — ")}</strong></div>
              <div className="pitch" role="group" aria-label={`${formation} 포메이션 선수 배치`}>
                <div className="pitch-stripe stripe-one" /><div className="pitch-stripe stripe-two" /><div className="pitch-stripe stripe-three" />
                <div className="pitch-line halfway" /><div className="pitch-circle" />
                <div className="pitch-box top-box" /><div className="pitch-box bottom-box" />
                <div className="pitch-goal top-goal" /><div className="pitch-goal bottom-goal" />
                {players.map((player) => {
                  const score = formatRating(player.seasonAverage);
                  return (
                    <button
                      className={`pitch-player ${player.id === selectedPlayer ? "is-selected" : ""}`}
                      key={player.id}
                      style={{ left: `${player.x}%`, top: `${player.y}%` }}
                      onClick={() => { setSelectedPlayer(player.id); setSelectedScore(null); }}
                      aria-label={`${player.nameKr}, 등번호 ${player.number}, 시즌 평점 ${score}`}
                    >
                      <span className={`player-rating ${player.seasonAverage === null ? "unrated" : ""}`}>{score}</span>
                      <span className="player-shirt">{player.number}</span>
                      <span className="player-name">{player.shortName}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pitch-footer"><span><i className="dot gold-dot" /> 선수를 선택해 팬 평점을 남겨보세요</span><span>4 DEF · 3 MID · 3 FWD</span></div>
            </div>

            <aside className="rating-panel">
              <div className="panel-heading">
                <div><span className="panel-overline">PLAYER SPOTLIGHT</span><h3>{selected ? selected.nameKr : `${season} 베스트 11`}</h3>{selected && <span className="player-name-en">{selected.name}</span>}</div>
                <span className="panel-number">{selected ? `#${selected.number}` : "01"}</span>
              </div>
              <p className="panel-role">{selected ? selected.role : "시즌 평균 평점 TOP 3"}</p>
              {selected ? (
                <>
                  <div className="spotlight-score"><strong>{formatRating(selected.seasonAverage)}</strong><span>/ 10</span><div><Icon name="star" size={17} /><small>시즌 평균</small></div></div>
                  <div className="season-rating-detail">
                    <div className="last-five-title"><span>{season} 시즌 평균</span><span>{selected.seasonAverage === null ? "기록 없음" : "입력 데이터"}</span></div>
                    {selected.seasonAverage === null ? (
                      <p className="season-data-note">시즌 평균 평점이 등록되지 않았습니다.</p>
                    ) : (
                      <div className="bar-track season-bar"><i style={{ width: `${selected.seasonAverage * 10}%` }} /></div>
                    )}
                  </div>
                  <div className="community-score">
                    <span><Icon name="users" size={16} /> 내 팬 평점</span>
                    <b>{fanAverage(selected.id)?.toFixed(1) ?? "—"}<small>{fanAverage(selected.id) === null ? "미투표" : "이 기기에 저장"}</small></b>
                  </div>
                </>
              ) : (
                <>
                  <div className="top-player-list">
                    {topRated.map((player, index) => (
                      <button className="top-player" key={player.id} onClick={() => { setSelectedPlayer(player.id); setSelectedScore(null); }}>
                        <span className="top-rank">0{index + 1}</span>
                        <span className="top-player-info"><b>{player.nameKr}</b><small>#{player.number} · {player.role}</small></span>
                        <span className="top-player-score"><Icon name="star" size={13} />{formatRating(player.seasonAverage)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="panel-hint">선수를 선택하면 시즌 평균과 이 브라우저에 저장된 팬 평점을 확인할 수 있어요.</div>
                </>
              )}
              <button className="vote-button" onClick={() => {
                if (!selectedPlayer) setSelectedPlayer("mbappe");
                setSelectedScore(null);
              }}>
                <Icon name="star" size={16} /> 선택 선수 평점 남기기 <Icon name="arrow" size={16} />
              </button>
              <p className="panel-disclaimer">비공식 팬 평점 · 이 브라우저에만 저장됩니다</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="page-width about-inner">
          <div className="about-mark"><Icon name="star" size={22} /></div>
          <div><div className="eyebrow light"><span /> A FAN-POWERED SPACE</div><h2>우리의 목소리로<br /><em>만드는 평점.</em></h2></div>
          <p>이곳의 평점은 구단이나 언론사의 공식 점수가 아닙니다. 팬들이 경기를 보고 직접 참여하는 비공식 팬 평가예요.</p>
          <a className="about-button" href="#lineup">선수 평점 참여하기 <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page-width footer-main">
          <a className="brand footer-brand" href="#home"><CrestMark /><span className="brand-copy"><strong>MADRIDISTA</strong><small>FAN CLUB · KOREA</small></span></a>
          <nav className="footer-nav" aria-label="푸터 메뉴">
            <a href="#home">홈</a><a href="#schedule">경기 일정</a><a href="#lineup">베스트 11</a><a href="#about">팬 평점 안내</a>
          </nav>
          <p>레알마드리드 CF와 제휴되지 않은 비공식 팬 프로젝트입니다.</p>
        </div>
        <div className="page-width footer-bottom">
          <span>© 2026 MADRIDISTA · 비공식 팬페이지</span>
          <span>사진: Zoser / Wikimedia Commons · 크롭 편집 · CC BY 4.0</span>
          <span>엠블럼은 Real Madrid CF의 상표입니다.</span>
        </div>
      </footer>

      {mobileMenuOpen && <button className="menu-backdrop" aria-label="메뉴 닫기" onClick={() => setMobileMenuOpen(false)} />}

      {selected && (
        <div className="vote-dock" role="dialog" aria-label={`${selected.name} 팬 평점 입력`}>
          <div className="vote-dock-copy"><span className="dock-player-number">#{selected.number}</span><span><b>{selected.nameKr}</b><small>오늘 경기에서 이 선수는 어땠나요?</small></span></div>
          <div className="vote-scores" aria-label="1점부터 10점까지 선택">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
              <button key={score} className={selectedScore === score ? "chosen" : ""} onClick={() => setSelectedScore(score)} aria-pressed={selectedScore === score}>{score}</button>
            ))}
          </div>
          <button className="submit-vote" onClick={submitVote} disabled={selectedScore === null}>{saved ? "등록 완료 ✓" : "투표하기"}</button>
          <button className="close-vote" onClick={() => { setSelectedPlayer(null); setSelectedScore(null); }} aria-label="평점 입력 닫기"><Icon name="close" size={18} /></button>
        </div>
      )}
    </main>
  );
}
