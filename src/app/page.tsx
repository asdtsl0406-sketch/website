"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { average, fixtures, formatRating, formation, players, season } from "@/lib/data";

type VoteMap = Record<string, number[]>;

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
  return (
    <svg {...common}>
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function CrestMark() {
  return (
    <span className="crest-mark" aria-hidden="true">
      <span>RM</span>
    </span>
  );
}

export default function Home() {
  const [votes, setVotes] = useState<VoteMap>({});
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

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

  const selected = players.find((player) => player.id === selectedPlayer) ?? null;
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

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        MADRIDISMO · 팬이 함께 만드는 레알마드리드 이야기
      </div>

      <header className="site-header">
        <a className="brand" href="#home" aria-label="Madridista 홈">
          <CrestMark />
          <span className="brand-copy">
            <strong>MADRIDISTA</strong>
            <small>FAN CLUB · KOREA</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="메인 메뉴">
          <a className="active" href="#home">홈</a>
          <a href="#lineup">베스트 11</a>
          <a href="#schedule">경기 일정</a>
          <a href="#about">팬 평점 안내</a>
        </nav>
        <a className="header-cta" href="#lineup">
          매치데이 보기 <Icon name="arrow" size={16} />
        </a>
      </header>

      <section className="hero" id="home">
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
            <div className="eyebrow light"><span /> THE HOME OF MADRIDISMO</div>
            <p className="hero-kicker">함께 외치는 그 이름</p>
            <h1>Hala<br /><em>Madrid.</em></h1>
            <p className="hero-description">
              승리의 순간도, 다시 일어서는 순간도.<br />
              한국의 마드리디스타와 함께합니다.
            </p>
            <a className="hero-button" href="#lineup">
              오늘의 베스트 11 <Icon name="arrow" size={17} />
            </a>
          </div>
          <div className="hero-match-card">
            <div className="match-card-top">
              <span className="live-label"><i /> NEXT MATCH</span>
              <span className="demo-chip">예시 일정</span>
            </div>
            <div className="hero-fixture">
              <div className="hero-team home-team"><CrestMark /><span>REAL<br />MADRID</span></div>
              <span className="versus">VS</span>
              <div className="hero-team away-team"><span className="opponent-badge">A</span><span>ATHLETIC<br />CLUB</span></div>
            </div>
            <div className="match-card-divider" />
            <div className="match-card-bottom">
              <span><Icon name="calendar" size={16} /> 2026.11.22 · 22:00 KST</span>
              <span>산티아고 베르나베우</span>
            </div>
          </div>
          <div className="hero-scroll">SCROLL TO EXPLORE <span /></div>
        </div>
        <div className="image-credit">
          Photo: Zoser · cropped · <a href="https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg" target="_blank" rel="noreferrer">CC BY 4.0</a>
        </div>
      </section>

      <section className="match-strip" aria-label="팀 정보">
        <div className="strip-inner page-width">
          <div className="strip-item"><span className="strip-icon"><Icon name="star" size={17} /></span><span><b>HALA MADRID</b><small>REAL MADRID · FAN PAGE</small></span></div>
          <div className="strip-item"><span className="strip-number">15</span><span><b>EUROPEAN CUPS</b><small>THE MOST DECORATED</small></span></div>
          <div className="strip-item"><span className="strip-number">1902</span><span><b>ESTABLISHED</b><small>MADRID, SPAIN</small></span></div>
          <div className="strip-note">Siempre fieles. Siempre Madrid.</div>
        </div>
      </section>

      <section className="lineup-section section-pad" id="lineup">
        <div className="page-width">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span /> MATCHDAY · FAN RATINGS</div>
              <h2>팬이 선택한 <em>BEST 11</em></h2>
              <p className="section-subtitle">입력하신 {season} 선수단 · {formation} 포메이션</p>
            </div>
            <div className="rating-legend">
              <span className="legend-star"><Icon name="star" size={15} /></span>
              <span><b>{season} 시즌 평균</b><small>제공해주신 JSON 기준</small></span>
            </div>
          </div>

          <div className="demo-notice">
            <span className="notice-mark">i</span>
            <span><b>데이터 안내</b> · 선수단과 시즌 평점은 제공해주신 JSON을 사용합니다. 최근 5경기 평점은 반영하지 않았고, 경기 일정은 예시 데이터예요.</span>
            <span className="data-pill">2026–27 SQUAD</span>
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
              <div className="pitch-footer"><span><i className="dot gold-dot" /> 선수 선택 후 팬 평점 남기기</span><span>4 DEF · 3 MID · 3 FWD</span></div>
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
                    <div className="last-five-title"><span>{season} 시즌 평점</span><span>{selected.seasonAverage === null ? "기록 없음" : "입력 데이터"}</span></div>
                    {selected.seasonAverage === null ? (
                      <p className="season-data-note">제공된 JSON에 시즌 평균이 없어 평점을 표시하지 않습니다.</p>
                    ) : (
                      <div className="bar-track season-bar"><i style={{ width: `${selected.seasonAverage * 10}%` }} /></div>
                    )}
                    <p className="season-data-note">요청에 따라 최근 5경기 평점은 사용하지 않았습니다.</p>
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

      <section className="schedule-section section-pad" id="schedule">
        <div className="page-width">
          <div className="schedule-heading">
            <div>
              <div className="eyebrow"><span /> ON THE HORIZON</div>
              <h2>다음 <em>경기 일정</em></h2>
            </div>
            <a className="text-link" href="#schedule">전체 일정 보기 <Icon name="arrow" size={16} /></a>
          </div>
          <div className="fixture-grid">
            {fixtures.map((fixture, index) => (
              <article className={`fixture-card ${index === 0 ? "featured-fixture" : ""}`} key={fixture.id}>
                <div className="fixture-card-head"><span>{fixture.competition}</span><span className="fixture-date">{fixture.date}<small>{fixture.weekday}</small></span></div>
                <div className="fixture-teams">
                  <div className="fixture-club"><CrestMark /><span>REAL<br />MADRID</span></div>
                  <span className="fixture-vs">VS</span>
                  <div className="fixture-club opponent"><span className="opponent-badge">{fixture.opponentShort.slice(0, 1)}</span><span>{fixture.opponent.toUpperCase()}</span></div>
                </div>
                <div className="fixture-venue"><span><i /> {fixture.venue}</span><span>예시</span></div>
              </article>
            ))}
          </div>
          <p className="schedule-footnote">일정은 화면 확인을 위한 예시입니다. API 연동 후 공식 일정으로 교체할 수 있어요.</p>
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="page-width about-inner">
          <div className="about-mark"><Icon name="star" size={22} /></div>
          <div><div className="eyebrow light"><span /> A FAN-POWERED SPACE</div><h2>우리의 목소리로<br /><em>만드는 평점.</em></h2></div>
          <p>이곳의 평점은 구단이나 언론사의 공식 점수가 아닙니다. 팬들이 경기를 보고 직접 참여하는 비공식 팬 평가예요. 한 표 한 표가 모여 다음 경기의 이야기를 만듭니다.</p>
          <a className="about-button" href="#lineup">선수 평점 참여하기 <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page-width footer-main">
          <a className="brand footer-brand" href="#home"><CrestMark /><span className="brand-copy"><strong>MADRIDISTA</strong><small>FAN CLUB · KOREA</small></span></a>
          <p>레알마드리드를 사랑하는 팬들을 위한 비공식 팬페이지</p>
          <a href="#home" className="back-top">BACK TO TOP ↑</a>
        </div>
        <div className="page-width footer-bottom" id="about-footer">
          <span>© 2026 MADRIDISTA FAN PAGE · 비공식 팬 프로젝트</span>
          <span>경기장 사진: Zoser / Wikimedia Commons · 크롭 편집 · CC BY 4.0</span>
        </div>
      </footer>

      {selected && (
        <div className="vote-dock" role="dialog" aria-label={`${selected.name} 팬 평점 입력`}>
          <div className="vote-dock-copy"><span className="dock-player-number">#{selected.number}</span><span><b>{selected.nameKr}</b><small>오늘 경기에서 이 선수는 어땠나요?</small></span></div>
          <div className="vote-scores" aria-label="1점부터 10점까지 선택">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
              <button
                key={score}
                className={selectedScore === score ? "chosen" : ""}
                onClick={() => setSelectedScore(score)}
                aria-pressed={selectedScore === score}
              >{score}</button>
            ))}
          </div>
          <button className="submit-vote" onClick={submitVote} disabled={selectedScore === null}>
            {saved ? "등록 완료 ✓" : "투표하기"}
          </button>
          <button className="close-vote" onClick={() => { setSelectedPlayer(null); setSelectedScore(null); }} aria-label="평점 입력 닫기"><Icon name="close" size={18} /></button>
        </div>
      )}
    </main>
  );
}
