"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  COMMUNITY_BODY_MAX_LENGTH,
  COMMUNITY_TITLE_MAX_LENGTH,
  communityPostBoards,
  formatCommunityPostDate,
  getCommunityBoardLabel,
  isCommunityContentBoard,
  toCommunityBoardId,
  type CommunityBoardViewId,
  type CommunityContentBoardId,
  type CommunityPost,
  type CommunityPostFieldErrors,
} from "@/lib/community-posts";
import { communityBoardCopy } from "@/lib/community-board-copy";
import { communityExamples } from "@/lib/community-examples";
import styles from "./community.module.css";

type FeedPost = CommunityPost & {
  summary?: string;
  isExample: boolean;
};

const examplePosts: FeedPost[] = communityExamples.map((post) => ({
  id: post.id,
  board: toCommunityBoardId(post.board) ?? "free",
  title: communityBoardCopy[post.id]?.title ?? post.title,
  body: communityBoardCopy[post.id]?.body ?? post.body,
  summary: communityBoardCopy[post.id]?.summary ?? post.summary,
  createdAt: "",
  isExample: true,
}));

function getRequestedBoard(value: string | null): CommunityBoardViewId | null {
  if (value === "all") return "all";
  if (isCommunityContentBoard(value)) return value;
  return value ? toCommunityBoardId(value) : null;
}

export function CommunityFeed({
  posts,
  storeNotice,
}: {
  posts: CommunityPost[];
  storeNotice: string | null;
}) {
  const router = useRouter();
  const [board, setBoard] = useState<CommunityBoardViewId>("all");
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeBoard, setComposeBoard] = useState<CommunityContentBoardId>("match_discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CommunityPostFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const requested = getRequestedBoard(new URLSearchParams(window.location.search).get("board"));
    if (requested) setBoard(requested);
  }, []);

  const selectedBoard = communityPostBoards.find((item) => item.id === board) ?? communityPostBoards[0];

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...posts.map((post) => ({ ...post, summary: undefined, isExample: false })), ...examplePosts]
      .filter((post) => board === "all" || post.board === board)
      .filter((post) => !normalizedQuery || post.title.toLocaleLowerCase().includes(normalizedQuery));
  }, [board, posts, query]);

  function openCompose() {
    setComposeBoard(board === "all" ? "match_discussion" : board);
    setComposeOpen(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  }

  function closeCompose() {
    if (pending) return;
    setComposeOpen(false);
    setFieldErrors({});
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: composeBoard, title, body }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            fieldErrors?: CommunityPostFieldErrors;
            diagnostic?: {
              supabaseStatus?: number | null;
              supabaseCode?: string | null;
              networkReason?: string | null;
              supabaseHost?: string | null;
            };
          }
        | null;

      if (!response.ok) {
        setFieldErrors(data?.fieldErrors ?? {});
        const diagnostic = data?.diagnostic;
        const diagnosticSuffix = diagnostic?.supabaseStatus
          ? ` (Supabase ${diagnostic.supabaseStatus}${diagnostic.supabaseCode ? ` / ${diagnostic.supabaseCode}` : ""})`
          : diagnostic?.networkReason
            ? ` (연결: ${diagnostic.networkReason}${diagnostic.supabaseHost ? ` / ${diagnostic.supabaseHost}` : ""})`
            : "";
        setFormError(`${data?.error ?? "글을 등록하지 못했습니다."}${diagnosticSuffix}`);
        return;
      }

      setTitle("");
      setBody("");
      setComposeOpen(false);
      setSuccessMessage("익명 글이 등록되었습니다.");
      router.refresh();
    } catch {
      setFormError("네트워크 오류로 글을 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.feed} aria-label={`${selectedBoard.label} 게시판`}>
      <div className={styles.controls}>
        <div className={styles.tabs} aria-label="게시판 분류">
          {communityPostBoards.map((item) => (
            <button
              className={`${styles.tab} ${board === item.id ? styles.activeTab : ""}`}
              type="button"
              key={item.id}
              aria-pressed={board === item.id}
              onClick={() => setBoard(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <label className={styles.search}>
            <span className={styles.srOnly}>글 제목 검색</span>
            <input
              type="search"
              value={query}
              placeholder="글 제목 검색"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className={styles.writeButton}
            type="button"
            aria-expanded={composeOpen}
            onClick={composeOpen ? closeCompose : openCompose}
          >
            {composeOpen ? "글쓰기 닫기" : "익명 글쓰기"}
          </button>
        </div>
      </div>

      {storeNotice && <p className={styles.notice} role="status">{storeNotice}</p>}
      {successMessage && <p className={styles.successMessage} role="status">{successMessage}</p>}

      {composeOpen && (
        <form className={styles.compose} onSubmit={handleSubmit} noValidate>
          <div className={styles.composeHeading}>
            <h2>익명 글쓰기</h2>
            <p>작성자는 익명으로 표시됩니다. 로그인 없이 등록할 수 있어요.</p>
          </div>

          <label>
            게시판
            <select
              value={composeBoard}
              onChange={(event) => setComposeBoard(event.target.value as CommunityContentBoardId)}
            >
              {communityPostBoards
                .filter((item) => item.id !== "all")
                .map((item) => (
                  <option value={item.id} key={item.id}>{item.label}</option>
                ))}
            </select>
            {fieldErrors.board && <span className={styles.fieldError}>{fieldErrors.board}</span>}
          </label>

          <label>
            제목
            <input
              type="text"
              value={title}
              maxLength={COMMUNITY_TITLE_MAX_LENGTH}
              placeholder="제목을 입력해주세요"
              onChange={(event) => setTitle(event.target.value)}
            />
            {fieldErrors.title && <span className={styles.fieldError}>{fieldErrors.title}</span>}
          </label>

          <label>
            본문
            <textarea
              value={body}
              maxLength={COMMUNITY_BODY_MAX_LENGTH}
              rows={7}
              placeholder="본문을 입력해주세요"
              onChange={(event) => setBody(event.target.value)}
            />
            {fieldErrors.body && <span className={styles.fieldError}>{fieldErrors.body}</span>}
          </label>

          <div className={styles.composeFooter}>
            <span className={styles.counter}>
              제목 {title.length}/{COMMUNITY_TITLE_MAX_LENGTH} · 본문 {body.length}/{COMMUNITY_BODY_MAX_LENGTH}
            </span>
            <div className={styles.composeButtons}>
              <button className={styles.cancelButton} type="button" onClick={closeCompose} disabled={pending}>
                취소
              </button>
              <button className={styles.submitButton} type="submit" disabled={pending}>
                {pending ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>

          {formError && <p className={styles.formError} role="alert">{formError}</p>}
        </form>
      )}

      <p className={styles.previewNote}>익명 게시판 · 예시 글은 &lsquo;예시&rsquo;로 표시됩니다</p>
      {visiblePosts.length === 0 ? (
        <p className={styles.emptyState} role="status">검색 조건에 맞는 글이 없어요</p>
      ) : (
        <div className={styles.postList}>
          {visiblePosts.map((post) => (
            <Link className={styles.postRow} href={`/community/${encodeURIComponent(post.id)}`} key={post.id}>
              <span className={styles.category}>{getCommunityBoardLabel(post.board)}</span>
              <span className={styles.postContent}>
                <b>{post.title}</b>
                <small>
                  {post.isExample ? (
                    <><span className={styles.exampleMark}>예시</span> {post.summary}</>
                  ) : (
                    <>익명 · {formatCommunityPostDate(post.createdAt)}</>
                  )}
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
