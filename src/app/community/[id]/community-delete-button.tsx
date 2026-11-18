"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../community.module.css";

export function CommunityDeleteButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function remove() {
    if (pending) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("글을 삭제하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      router.replace("/community");
    } catch {
      setError("글을 삭제하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.deleteArea}>
      {!confirming ? (
        <button
          type="button"
          className={styles.deleteTrigger}
          aria-expanded={false}
          onClick={() => setConfirming(true)}
        >
          글 삭제
        </button>
      ) : (
        <div
          className={styles.deleteConfirm}
          role="alertdialog"
          aria-labelledby={`delete-question-${postId}`}
        >
          <p id={`delete-question-${postId}`}>이 글을 삭제할까요?</p>
          <div className={styles.deleteActions}>
            <button
              type="button"
              className={styles.deleteCancel}
              ref={cancelRef}
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
              disabled={pending}
            >
              취소
            </button>
            <button
              type="button"
              className={styles.deleteSubmit}
              onClick={remove}
              disabled={pending}
            >
              {pending ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      )}
      {error && <p className={styles.deleteError} role="alert">{error}</p>}
    </div>
  );
}
