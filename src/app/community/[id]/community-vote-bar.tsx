"use client";

import { useState } from "react";
import type { CommunityVoteState } from "@/lib/community-votes";
import styles from "../community.module.css";

export function CommunityVoteBar({
  postId,
  initialUp,
  initialDown,
  initialVote,
  available,
}: {
  postId: string;
  initialUp: number;
  initialDown: number;
  initialVote: CommunityVoteState;
  available: boolean;
}) {
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState<CommunityVoteState>(initialVote);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(target: Exclude<CommunityVoteState, "none">) {
    if (pending) return;

    const desired: CommunityVoteState = myVote === target ? "none" : target;
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/community/posts/${encodeURIComponent(postId)}/votes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: desired }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; up?: unknown; down?: unknown; myVote?: unknown; error?: string }
        | null;

      if (!response.ok || data?.ok !== true) {
        setError("반응을 저장하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      // Only the aggregate returned by the server is applied, never a local guess.
      if (typeof data.up === "number") setUp(Math.max(0, Math.trunc(data.up)));
      if (typeof data.down === "number") setDown(Math.max(0, Math.trunc(data.down)));
      setMyVote(data.myVote === "up" ? "up" : data.myVote === "down" ? "down" : "none");
    } catch {
      setError("반응을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.voteArea}>
      <div className={styles.voteBar} role="group" aria-label="게시글 반응">
        <button
          type="button"
          className={`${styles.voteButton} ${myVote === "up" ? styles.voteButtonActive : ""}`}
          aria-pressed={myVote === "up"}
          onClick={() => submit("up")}
          disabled={pending}
        >
          <span>추천</span>
          <b>{available ? up : "–"}</b>
        </button>
        <span className={styles.voteDivider} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.voteButton} ${myVote === "down" ? styles.voteButtonActive : ""}`}
          aria-pressed={myVote === "down"}
          onClick={() => submit("down")}
          disabled={pending}
        >
          <span>비추천</span>
          <b>{available ? down : "–"}</b>
        </button>
      </div>
      {error && <p className={styles.voteError} role="alert">{error}</p>}
    </div>
  );
}
