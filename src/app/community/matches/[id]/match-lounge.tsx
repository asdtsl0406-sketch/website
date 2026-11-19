"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatCommunityPostDate } from "@/lib/community-posts";
import type { AppearedPlayer } from "@/lib/football-data";
import { matchLoungeBodyLimit, type MatchLoungeState } from "@/lib/match-lounge";
import styles from "../../community.module.css";

export function MatchLounge({ id, finished, candidates }: { id: string; finished: boolean; candidates: AppearedPlayer[] }) {
  const endpoint = `/api/community/matches/${id}`;
  const [state, setState] = useState<MatchLoungeState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [body, setBody] = useState("");
  const [reason, setReason] = useState("");
  const [selection, setSelection] = useState("");
  const selected = selection || state?.myVote || "";

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as MatchLoungeState & { error?: string };
        if (!response.ok) throw new Error(data.error);
        if (!Array.isArray(data.comments) || !data.votes) throw new Error("경기 토론을 불러오지 못했어요.");
        setLoadError("");
        setState(data);
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error && cause.message ? cause.message : "경기 토론을 불러오지 못했어요.");
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, revision]);

  async function send(event: FormEvent<HTMLFormElement>, type: "vote" | "comment") {
    event.preventDefault();
    if (!state || pending || loadError || (type === "vote" ? !selected : !body.trim())) return;
    setPending(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type === "vote" ? { type, playerId: selected, body: reason } : { type, body }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error);
      if (type === "comment") setBody("");
      if (type === "vote") setReason("");
      setSaved(type === "vote" ? "MVP 한 표를 남겼어요." : "댓글을 남겼어요.");
      setRevision(n => n + 1);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : "등록하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const names = new Map(candidates.map(player => [player.playerId, player.playerName]));
  const total = Object.values(state?.votes ?? {}).reduce((sum, count) => sum + count, 0);
  const results = candidates.map(player => ({ ...player, count: state?.votes[player.playerId] ?? 0 }))
    .filter(player => player.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className={styles.loungeArea}>
      {loadError ? <p className={styles.notice} role="status">{loadError}</p>
        : !state && <p className={styles.notice} role="status">경기 토론을 불러오는 중이에요.</p>}
      {error && <p className={styles.formError} role="alert">{error}</p>}
      {saved && <p className={styles.successMessage} role="status">{saved}</p>}

      {finished && (
        <section className={styles.loungePanel} aria-labelledby="mvp-heading">
          <h2 id="mvp-heading">오늘의 MVP</h2>
          <p>오늘 레알에서 누가 제일 잘했어?</p>
          {!candidates.length ? <p className={styles.loungeMuted}>확인된 출전 명단이 없어 아직 투표할 수 없어요.</p> : state && !loadError && (
            <>
              <form className={styles.loungeForm} onSubmit={event => void send(event, "vote")}>
                <label>MVP 후보
                  <select value={selected} onChange={event => setSelection(event.target.value)} disabled={pending}>
                    <option value="" disabled>출전 선수 고르기</option>
                    {candidates.map(player => <option key={player.playerId} value={player.playerId}>{player.playerName}</option>)}
                  </select>
                </label>
                <label>고른 이유 (선택)
                  <input value={reason} onChange={event => setReason(event.target.value)} maxLength={matchLoungeBodyLimit} disabled={pending} />
                </label>
                <button className={styles.writeButton} type="submit" disabled={pending || !selected}>
                  {state.myVote ? "내 표 바꾸기" : "한 표 던지기"}
                </button>
              </form>
              {state.myVote ? (
                <div className={styles.mvpResults} aria-live="polite">
                  <strong>현재 득표 · 총 {total}표</strong>
                  <ul>
                    {results.map(player => <li key={player.playerId}>
                      <span>{player.playerName}{player.playerId === state.myVote ? " · 내 한 표" : ""}</span>
                      <b>{player.count}표</b>
                    </li>)}
                  </ul>
                </div>
              ) : <p className={styles.loungeMuted}>한 표를 던지면 현재 득표를 볼 수 있어요.</p>}
            </>
          )}
        </section>
      )}

      <section className={styles.loungePanel} aria-labelledby="match-chat-heading">
        <h2 id="match-chat-heading">경기 토론</h2>
        <p>{finished ? "제일 기억에 남는 장면은 뭐였어?" : "킥오프 전에 스코어 하나씩 찍고 가자."}</p>
        {state && !loadError && (
          <>
            <form className={styles.loungeForm} onSubmit={event => void send(event, "comment")}>
              <label>댓글 쓰기
                <textarea value={body} onChange={event => setBody(event.target.value)} rows={3}
                  maxLength={matchLoungeBodyLimit} disabled={pending}
                  placeholder={finished ? "후반에 압박 올린 게 컸어." : "2:1 레알 승. 첫 골은 비니."} />
              </label>
              <button className={styles.writeButton} type="submit" disabled={pending || !body.trim()}>댓글 남기기</button>
            </form>
            {state.comments.length ? (
              <ul className={styles.loungeComments}>
                {state.comments.map(comment => (
                  <li key={comment.id}>
                    <small>익명 · {formatCommunityPostDate(comment.created_at)}
                      {comment.player_id && names.has(comment.player_id) ? ` · MVP ${names.get(comment.player_id)}` : ""}
                    </small>
                    <p>{comment.body}</p>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.loungeMuted}>아직 댓글이 없어요. 첫 이야기를 남겨볼래?</p>}
          </>
        )}
      </section>
    </div>
  );
}
