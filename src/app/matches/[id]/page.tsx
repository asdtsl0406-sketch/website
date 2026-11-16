"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { competitionLabel, koreanDate, type FootballTeam, type MatchDetails, type AppearedPlayer } from "@/lib/football-data";

type PlayerSummary = { player_id: string; player_name: string; average_score: number; rating_count: number };

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, user } = useAuth();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<PlayerSummary[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<AppearedPlayer | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/matches/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const payload = (await response.json()) as MatchDetails & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "경기 정보를 불러오지 못했습니다.");
        if (active) setMatch(payload);
      })
      .catch((error) => { if (active) setPageError(error instanceof Error ? error.message : "경기 정보를 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const client = supabase;
    const currentMatch = match;
    if (!client || !currentMatch) return;
    let active = true;
    async function loadRatings(db: NonNullable<typeof supabase>, details: MatchDetails) {
      const { data: summariesData } = await db.rpc("match_rating_summary", { p_match_id: details.id });
      if (active) setSummaries((summariesData ?? []) as PlayerSummary[]);
      if (!user) {
        if (active) setMyRatings({});
        return;
      }
      const { data: ownRatings } = await db
        .from("player_ratings")
        .select("player_id,score")
        .eq("match_id", details.id)
        .eq("user_id", user.id);
      if (active) setMyRatings(Object.fromEntries((ownRatings ?? []).map((rating) => [rating.player_id, rating.score])));
    }
    void loadRatings(client, currentMatch);
    return () => { active = false; };
  }, [supabase, match, user]);

  const summariesByPlayer = useMemo(() => new Map(summaries.map((summary) => [summary.player_id, summary])), [summaries]);
  const homePlayers = match?.appearedPlayers.filter((player) => player.teamId === match.homeTeam.id) ?? [];
  const awayPlayers = match?.appearedPlayers.filter((player) => player.teamId === match.awayTeam.id) ?? [];
  const dateLabel = match ? koreanDate(match.utcDate) : null;

  async function saveRating() {
    if (!supabase || !user || !match || !selectedPlayer || selectedScore === null) return;
    setSaving(true);
    setRatingMessage("");
    const { error } = await supabase.from("player_ratings").upsert({
      match_id: match.id,
      player_id: selectedPlayer.playerId,
      user_id: user.id,
      score: selectedScore,
      updated_at: new Date().toISOString(),
    }, { onConflict: "match_id,player_id,user_id" });
    if (error) {
      setRatingMessage("평점을 저장하지 못했습니다. Supabase 설정과 출전 명단을 확인해 주세요.");
    } else {
      setMyRatings((current) => ({ ...current, [selectedPlayer.playerId]: selectedScore }));
      const { data } = await supabase.rpc("match_rating_summary", { p_match_id: match.id });
      setSummaries((data ?? []) as PlayerSummary[]);
      setRatingMessage("평점을 저장했습니다. 다시 입력하면 기존 점수가 수정됩니다.");
      setSelectedScore(null);
    }
    setSaving(false);
  }

  function participantList(team: FootballTeam, list: AppearedPlayer[]) {
    return (
      <section className="match-participant-team">
        <h2>{team.name}</h2>
        {list.length === 0 ? <p className="page-state">출전 명단이 제공되지 않았습니다.</p> : (
          <div className="participant-list">
            {list.map((player) => {
              const summary = summariesByPlayer.get(player.playerId);
              const mine = myRatings[player.playerId];
              return (
                <button
                  type="button"
                  className={`participant-row ${selectedPlayer?.playerId === player.playerId ? "selected" : ""}`}
                  key={player.playerId}
                  onClick={() => { setSelectedPlayer(player); setSelectedScore(mine ?? null); setRatingMessage(""); }}
                >
                  <span className="participant-number">{player.shirtNumber ?? "—"}</span>
                  <span className="participant-name"><b>{player.playerName}</b><small>{player.position ?? "출전"}</small></span>
                  <span className="participant-metrics"><small>팬 평균</small><b>{summary ? Number(summary.average_score).toFixed(2) : "—"}</b></span>
                  <span className="participant-metrics count"><small>평가 인원</small><b>{summary?.rating_count ?? 0}</b></span>
                  <span className="participant-my-score"><small>내 점수</small><b>{mine ?? "—"}</b></span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="inner-page match-detail-page">
        <div className="page-width">
          <Link className="back-link" href="/matches">← 매치센터</Link>
          {loading ? <div className="page-state">경기 상세를 불러오는 중입니다.</div> : pageError || !match ? (
            <div className="page-state error">{pageError ?? "경기를 찾을 수 없습니다."}</div>
          ) : (
            <>
              <header className="match-detail-heading">
                <div className="eyebrow"><span /> {competitionLabel(match.competitionCode, match.competitionName)}</div>
                <p>{dateLabel?.dateLabel} · {dateLabel?.weekday} · {match.venue ?? "경기장 미정"}</p>
                <div className="match-detail-scoreboard">
                  <span>{match.homeTeam.name}</span>
                  <strong>{match.score?.home ?? "—"}<i>:</i>{match.score?.away ?? "—"}</strong>
                  <span>{match.awayTeam.name}</span>
                </div>
                <span className="match-status-label">{match.status === "FINISHED" ? "경기 종료" : "예정 경기"}</span>
              </header>

              <section className="match-review-links">
                <Link href={`/community?board=match_discussion&matchId=${match.id}`}>이 경기 토론 보기 →</Link>
                <Link href={`/community/new?board=match_discussion&matchId=${match.id}`}>경기 토론 글쓰기 →</Link>
              </section>

              {match.status === "FINISHED" && match.goals.length > 0 && (
                <section className="match-goals">
                  <h2>득점 기록</h2>
                  {match.goals.map((goal, index) => (
                    <p key={`${goal.minute}-${index}`}><b>{goal.minute === null ? "—" : `${goal.minute}′`}</b> {goal.scorer?.name ?? "득점자 확인 중"}{goal.assist?.name ? ` · 도움 ${goal.assist.name}` : ""}</p>
                  ))}
                </section>
              )}

              <div className="match-participants-heading">
                <div><div className="eyebrow"><span /> PLAYER RATINGS</div><h1>출전 선수 평점</h1><p>선발 출전 또는 교체 투입이 확인된 선수만 평가할 수 있습니다.</p></div>
              </div>

              {match.status !== "FINISHED" ? (
                <div className="page-state">경기 종료 후 출전 선수가 확정되면 평점을 남길 수 있습니다.</div>
              ) : match.appearedPlayers.length === 0 ? (
                <div className="page-state">현재 football-data.org 플랜에서 이 경기의 출전 명단을 제공하지 않아 평점 입력을 열 수 없습니다.</div>
              ) : !match.participantsSynced ? (
                <div className="page-state">평점 기능을 사용하려면 Supabase의 서버 전용 키와 schema.sql 설정이 필요합니다.</div>
              ) : !supabase ? (
                <div className="page-state">로그인과 공용 평점을 사용하려면 Supabase 환경변수를 설정해야 합니다.</div>
              ) : (
                <>
                  <div className="match-participants-grid">
                    {participantList(match.homeTeam, homePlayers)}
                    {participantList(match.awayTeam, awayPlayers)}
                  </div>
                  {!user ? (
                    <div className="rating-signin"><Link href={`/auth?next=/matches/${match.id}`}>로그인 후 평점 남기기</Link></div>
                  ) : selectedPlayer && (
                    <section className="rating-editor" aria-label={`${selectedPlayer.playerName} 평점 입력`}>
                      <div><span className="panel-overline">YOUR MATCH RATING</span><h2>#{selectedPlayer.shirtNumber ?? "—"} {selectedPlayer.playerName}</h2></div>
                      <div className="rating-editor-scores">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                          <button type="button" key={score} className={selectedScore === score ? "chosen" : ""} onClick={() => setSelectedScore(score)} aria-pressed={selectedScore === score}>{score}</button>
                        ))}
                      </div>
                      <button className="form-submit" type="button" disabled={selectedScore === null || saving} onClick={() => void saveRating()}>{saving ? "저장 중…" : myRatings[selectedPlayer.playerId] ? "평점 수정" : "평점 등록"}</button>
                      {ratingMessage && <p className="form-message" role="status">{ratingMessage}</p>}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
