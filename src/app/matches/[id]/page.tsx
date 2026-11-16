"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { competitionLabel, koreanDate, type FootballTeam, type MatchDetails, type AppearedPlayer } from "@/lib/football-data";

const RATING_STORAGE_KEY = "madridista-match-ratings";
type StoredRatings = Record<string, Record<string, number>>;

function readStoredRatings(): StoredRatings {
  try {
    const value = window.localStorage.getItem(RATING_STORAGE_KEY);
    return value ? JSON.parse(value) as StoredRatings : {};
  } catch {
    return {};
  }
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<AppearedPlayer | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [ratingMessage, setRatingMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPageError(null);
    fetch(`/api/matches/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const payload = (await response.json()) as MatchDetails & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "경기 정보를 불러오지 못했습니다.");
        if (active) setMatch(payload);
      })
      .catch((error) => {
        if (active) setPageError(error instanceof Error ? error.message : "경기 정보를 불러오지 못했습니다.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const matchId = match?.id;
  useEffect(() => {
    if (!matchId) return;
    setMyRatings(readStoredRatings()[matchId] ?? {});
  }, [matchId]);

  const homePlayers = match?.appearedPlayers.filter((player) => player.teamId === match.homeTeam.id) ?? [];
  const awayPlayers = match?.appearedPlayers.filter((player) => player.teamId === match.awayTeam.id) ?? [];
  const dateLabel = match ? koreanDate(match.utcDate) : null;

  function saveRating() {
    if (!match || !selectedPlayer || selectedScore === null) return;
    const allRatings = readStoredRatings();
    const matchRatings = { ...allRatings[match.id], [selectedPlayer.playerId]: selectedScore };
    const updated = { ...allRatings, [match.id]: matchRatings };
    try {
      window.localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(updated));
      setMyRatings(matchRatings);
      setRatingMessage("내 평점을 저장했습니다. 이 브라우저에만 저장됩니다.");
    } catch {
      setRatingMessage("브라우저 저장소에 평점을 저장할 수 없습니다.");
    }
  }

  function participantList(team: FootballTeam, list: AppearedPlayer[]) {
    return (
      <section className="match-participant-team">
        <h2>{team.name}</h2>
        {list.length === 0 ? <p className="page-state">출전 명단이 제공되지 않았습니다.</p> : (
          <div className="participant-list">
            {list.map((player) => {
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
                  <span className="participant-my-score"><small>내 평점</small><b>{mine ?? "—"}</b></span>
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
                <Link href="/community?board=match_discussion">경기 토론 게시판 둘러보기 →</Link>
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
                <div><div className="eyebrow"><span /> PLAYER RATINGS</div><h1>출전 선수 평점</h1><p>출전 명단이 API로 확인된 선수만 평가할 수 있습니다.</p></div>
              </div>
              <p className="rating-storage-note">내 평점 · 이 브라우저에만 저장</p>

              {match.status !== "FINISHED" ? (
                <div className="page-state">경기 종료 후 출전 선수가 확인되면 내 평점을 남길 수 있습니다.</div>
              ) : match.appearedPlayers.length === 0 ? (
                <div className="page-state">이 경기의 출전 명단이 제공되지 않아 평점을 입력할 수 없습니다.</div>
              ) : (
                <>
                  <div className="match-participants-grid">
                    {participantList(match.homeTeam, homePlayers)}
                    {participantList(match.awayTeam, awayPlayers)}
                  </div>
                  {selectedPlayer && (
                    <section className="rating-editor" aria-label={`${selectedPlayer.playerName} 평점 입력`}>
                      <div><span className="panel-overline">YOUR MATCH RATING</span><h2>#{selectedPlayer.shirtNumber ?? "—"} {selectedPlayer.playerName}</h2></div>
                      <div className="rating-editor-scores">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                          <button type="button" key={score} className={selectedScore === score ? "chosen" : ""} onClick={() => setSelectedScore(score)} aria-pressed={selectedScore === score}>{score}</button>
                        ))}
                      </div>
                      <button className="form-submit" type="button" disabled={selectedScore === null} onClick={saveRating}>{myRatings[selectedPlayer.playerId] ? "내 평점 수정" : "내 평점 저장"}</button>
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
