"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { scoutLeagues, scoutPositions, scoutRoleLabel, type ScoutMatchStats, type ScoutPlayer, type ScoutPosition } from "@/lib/scout";
import styles from "./squad.module.css";

type Comment = { id: number; body: string; created_at: string };
const formatDate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export function ScoutPlayerDialog({ player, position, onClose }: {
  player: ScoutPlayer;
  position: ScoutPosition;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [stats, setStats] = useState<ScoutMatchStats | null | undefined>(undefined);
  const commentEndpoint = `/api/community/scout/${player.id}`;
  const positionLabel = player.role ? scoutRoleLabel(player.role) : scoutPositions[position];

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadComments() {
      try {
        const response = await fetch(commentEndpoint, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { comments?: Comment[]; error?: string };
        if (!response.ok || !Array.isArray(data.comments)) throw new Error(data.error);
        setComments(data.comments);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error && error.message ? error.message : "기존 의견을 불러오지 못했어요.");
        }
      }
    }
    void loadComments();
    return () => controller.abort();
  }, [commentEndpoint]);

  useEffect(() => {
    if (!player.league) return;
    const controller = new AbortController();
    async function loadStats() {
      try {
        const response = await fetch(`/api/scout/players/${player.id}?league=${player.league}`, { signal: controller.signal });
        const data = await response.json() as { stats?: ScoutMatchStats | null };
        setStats(response.ok ? data.stats ?? null : null);
      } catch {
        if (!controller.signal.aborted) setStats(null);
      }
    }
    void loadStats();
    return () => controller.abort();
  }, [player.id, player.league]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (posting || !comments || !body.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const response = await fetch(commentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json() as { comment?: Comment; error?: string };
      if (!response.ok || !data.comment) throw new Error(data.error);
      const comment = data.comment;
      setComments(current => [comment, ...(current ?? []).filter(item => item.id !== comment.id)].slice(0, 30));
      setBody("");
    } catch (error) {
      setPostError(error instanceof Error && error.message ? error.message : "의견을 저장하지 못했어요.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <dialog className={styles.scoutDialog} ref={dialog} onClose={onClose} aria-labelledby="scout-player-title">
      <header className={styles.scoutDialogHeader}>
        <div>
          <p>{player.league ? scoutLeagues[player.league] + " · " : ""}{player.club}</p>
          <h2 id="scout-player-title">{player.name}</h2>
        </div>
        <button type="button" onClick={() => dialog.current?.close()}>닫기</button>
      </header>
      <section aria-label="선수 프로필">
        <dl className={styles.scoutFacts}>
          <div><dt>포지션</dt><dd>{positionLabel}{!player.role && position !== "goalkeeper" && <small> · 세부 포지션 미확인</small>}</dd></div>
          {player.age !== null && <div><dt>나이</dt><dd>만 {player.age}세</dd></div>}
          {player.nationality && <div><dt>국적</dt><dd>{player.nationality}</dd></div>}
          {player.shirtNumber !== undefined && <div><dt>등번호</dt><dd>{player.shirtNumber}번</dd></div>}
          {player.contractUntil && <div><dt>계약 만료</dt><dd>{player.contractUntil}</dd></div>}
        </dl>
        <h3>이번 시즌 리그 기록</h3>
        {stats ? (
          <>
            <dl className={styles.scoutFacts}>
              <div><dt>출전</dt><dd>{stats.appearances}경기</dd></div>
              <div><dt>선발</dt><dd>{stats.starts}경기</dd></div>
              <div><dt>출전 시간</dt><dd>{stats.minutes.toLocaleString("ko-KR")}분</dd></div>
            </dl>
            {stats.first && stats.last && <p className={styles.scoutNotice}>기록 기간 · {stats.first} ~ {stats.last}</p>}
          </>
        ) : (
          <p className={styles.scoutNotice} role="status">
            {stats === undefined && player.league ? "이번 시즌 기록을 불러오는 중이에요." : "이번 시즌 리그 기록은 아직 확인되지 않았어요."}
          </p>
        )}
        <p className={styles.scoutSource}>데이터 출처 · football-data.org</p>
      </section>
      <section className={styles.scoutDiscussion} aria-labelledby="scout-discussion-title">
        <h3 id="scout-discussion-title">영입 토론</h3>
        <p className={styles.scoutNotice}>이 선수, 레알에 오면 주전도 가능할까요? 어떤 역할이 어울릴지 얘기해봐요.</p>
        {loadError ? <p className={styles.scoutNotice} role="alert">{loadError}</p> : comments === null ? (
          <p className={styles.scoutNotice} role="status">댓글을 불러오는 중이에요.</p>
        ) : (
          <>
            <form className={styles.scoutCommentForm} onSubmit={addComment}>
              <label htmlFor="scout-comment">댓글 쓰기</label>
              <textarea id="scout-comment" value={body} onChange={event => setBody(event.target.value)}
                disabled={posting} maxLength={500} rows={3} placeholder="레알에서 어느 자리에 쓰면 좋을까요?" />
              <button type="submit" disabled={posting || !body.trim()}>{posting ? "등록 중…" : "댓글 남기기"}</button>
              {postError && <p className={styles.scoutNotice} role="alert">{postError}</p>}
            </form>
            {comments.length ? (
              <ul className={styles.scoutComments} aria-live="polite">
                {comments.map(comment => (
                  <li key={comment.id}>
                    <small>익명 팬 · <time dateTime={comment.created_at}>{formatDate.format(new Date(comment.created_at))}</time></small>
                    <p>{comment.body}</p>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.scoutNotice}>아직 댓글이 없어요. 이 선수 영입, 어떻게 보세요?</p>}
          </>
        )}
      </section>
    </dialog>
  );
}
