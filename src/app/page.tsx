"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatRating, formation, players, season } from "@/lib/data";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName, type FixturesResponse, type FootballTeam } from "@/lib/football-data";

type RatingSummary = { player_id: string; player_name: string; average_score: number; rating_count: number };
type LoungePost = { id: string; title: string; board: string; created_at: string; author_id: string; nickname: string; commentCount: number };

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  if (name === "star") return <svg {...common} fill="currentColor" stroke="none"><path d="m12 2.8 2.83 5.73 6.32.92-4.57 4.45 1.08 6.29L12 17.22l-5.66 2.97 1.08-6.29L2.85 9.45l6.32-.92L12 2.8Z" /></svg>;
  if (name === "comments") return <svg {...common}><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.5A7.5 7.5 0 1 1 21 11.5Z" /><path d="M8 11h8M8 14h5" /></svg>;
  return <svg {...common}><path d="M12 3v18M3 12h18" /></svg>;
}

function CrestMark() {
  return <span className="crest-mark" aria-hidden="true"><Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized /></span>;
}

function TeamMark({ team }: { team: FootballTeam }) {
  if (team.id === 86) return <CrestMark />;
  return <span className="opponent-badge">{team.tla ?? team.shortName?.slice(0, 1) ?? team.name.slice(0, 1)}</span>;
}

const boardLabels: Record<string, string> = {
  match_discussion: "경기 토론",
  tactics_players: "전술·선수",
  free_chat: "자유·잡담",
};

function HomeContent() {
  const { supabase } = useAuth();
  const [fixturesData, setFixturesData] = useState<FixturesResponse>({ matches: [], recentResults: [] });
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [recentRatings, setRecentRatings] = useState<RatingSummary[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [loungePosts, setLoungePosts] = useState<LoungePost[]>([]);
  const [loungeLoading, setLoungeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadFixtures() {
      try {
        const response = await fetch("/api/fixtures");
        const payload = (await response.json()) as FixturesResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "경기 일정을 불러오지 못했습니다.");
        if (!cancelled) {
          setFixturesData({ matches: payload.matches ?? [], recentResults: payload.recentResults ?? [] });
          setFixturesError(null);
        }
      } catch (error) {
        if (!cancelled) setFixturesError(error instanceof Error ? error.message : "경기 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    }
    void loadFixtures();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoungeLoading(false);
      return;
    }
    let cancelled = false;
    setLoungeLoading(true);
    async function loadPosts(db: NonNullable<typeof supabase>) {
      const { data, error } = await db
        .from("posts")
        .select("id,title,board,created_at,author_id")
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error || !data?.length) {
        if (!cancelled) setLoungePosts([]);
        return;
      }
      const postIds = data.map((post) => post.id);
      const authorIds = [...new Set(data.map((post) => post.author_id))];
      const [{ data: profiles }, { data: comments }] = await Promise.all([
        db.from("profiles").select("id,nickname").in("id", authorIds),
        db.from("comments").select("post_id").eq("status", "visible").in("post_id", postIds),
      ]);
      const nicknames = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));
      const counts = new Map<string, number>();
      (comments ?? []).forEach((comment) => counts.set(comment.post_id, (counts.get(comment.post_id) ?? 0) + 1));
      if (!cancelled) setLoungePosts(data.map((post) => ({
        ...post,
        nickname: nicknames.get(post.author_id) ?? "마드리디스타",
        commentCount: counts.get(post.id) ?? 0,
      })));
    }
    void loadPosts(client).finally(() => { if (!cancelled) setLoungeLoading(false); });
    return () => { cancelled = true; };
  }, [supabase]);

  const latestResult = fixturesData.recentResults[0] ?? null;
  const latestResultId = latestResult?.id;
  useEffect(() => {
    const client = supabase;
    if (!client || !latestResultId) {
      setRecentRatings([]);
      return;
    }
    let cancelled = false;
    setRatingsLoading(true);
    async function loadRatings(db: NonNullable<typeof supabase>, matchId: string) {
      const { data, error } = await db.rpc("match_rating_summary", { p_match_id: matchId });
      if (!cancelled) setRecentRatings(error ? [] : ((data ?? []) as RatingSummary[]).slice(0, 3));
      if (!cancelled) setRatingsLoading(false);
    }
    void loadRatings(client, latestResultId);
    return () => { cancelled = true; };
  }, [supabase, latestResultId]);

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
                  <Link className="hero-button" href="/matches">매치센터 보기 <Icon name="arrow" size={17} /></Link>
                  <Link className="hero-secondary" href="/community">팬라운지 입장</Link>
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

        <section className="home-community-section">
          <div className="page-width home-community-grid">
            <section className="home-ratings-panel">
              <div className="home-section-heading compact">
                <div><div className="eyebrow"><span /> LAST MATCH · FAN VOTES</div><h2>팬 평점 <em>TOP 3</em></h2></div>
                <Link className="text-link" href="/matches">평점 보기 <span aria-hidden="true">→</span></Link>
              </div>
              {!supabase ? (
                <div className="home-empty compact-empty">팬 평점은 Supabase 연결 후 표시됩니다.</div>
              ) : ratingsLoading ? (
                <div className="home-empty compact-empty">최근 팬 평점을 불러오는 중입니다.</div>
              ) : recentRatings.length === 0 ? (
                <div className="home-empty compact-empty">최근 경기의 팬 평점이 아직 없습니다.</div>
              ) : (
                <ol className="home-rating-list">
                  {recentRatings.map((rating, index) => (
                    <li key={rating.player_id}>
                      <span className="top-rank">0{index + 1}</span>
                      <span><b>{rating.player_name}</b><small>평가 {rating.rating_count}명</small></span>
                      <strong>{Number(rating.average_score).toFixed(2)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="home-lounge-panel">
              <div className="home-section-heading compact">
                <div><div className="eyebrow"><span /> FROM THE FAN LOUNGE</div><h2>라운지 <em>최신 글</em></h2></div>
                <Link className="text-link" href="/community">팬라운지 <span aria-hidden="true">→</span></Link>
              </div>
              {!supabase ? (
                <div className="home-empty compact-empty">팬라운지는 Supabase 연결 후 열립니다.</div>
              ) : loungeLoading ? (
                <div className="home-empty compact-empty">최신 글을 불러오는 중입니다.</div>
              ) : loungePosts.length === 0 ? (
                <div className="home-empty compact-empty">아직 게시글이 없습니다. 팬라운지에서 첫 이야기를 시작해 보세요.</div>
              ) : (
                <div className="home-post-list">
                  {loungePosts.map((post) => (
                    <Link className="home-post-row" href={`/community/${post.id}`} key={post.id}>
                      <span className="board-label">{boardLabels[post.board] ?? "팬라운지"}</span>
                      <b>{post.title}</b>
                      <span className="home-post-meta">{post.nickname} · 댓글 {post.commentCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
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

        <section className="about-section" id="about">
          <div className="page-width about-inner">
            <div className="about-mark"><Icon name="star" size={22} /></div>
            <div><div className="eyebrow light"><span /> A FAN-POWERED SPACE</div><h2>우리의 목소리로<br /><em>만드는 평점.</em></h2></div>
            <p>경기 종료 후 출전 선수에게 1~10점을 남겨주세요. 같은 경기·선수의 점수는 다시 입력하면 수정되고, 시즌 평균과 팬 평균은 따로 표시합니다.</p>
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
