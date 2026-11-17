"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoards, communityExamples, type CommunityBoardId } from "@/lib/community-examples";
import { communityBoardCopy } from "@/lib/community-board-copy";
import styles from "./community.module.css";

export default function CommunityPage() {
  const [board, setBoard] = useState<CommunityBoardId>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("board");
    if (communityBoards.some((item) => item.id === requested)) {
      setBoard(requested as CommunityBoardId);
    }
  }, []);

  const selectedBoard = communityBoards.find((item) => item.id === board) ?? communityBoards[0];
  const posts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return communityExamples
      .filter((post) => board === "all" || post.board === board)
      .map((post) => ({ ...post, ...communityBoardCopy[post.id] }))
      .filter((post) => !normalizedQuery || post.title.toLocaleLowerCase().includes(normalizedQuery));
  }, [board, query]);

  return (
    <>
      <SiteHeader />
      <main className={`inner-page ${styles.page}`}>
        <div className="page-width">
          <header className={styles.heading}>
            <h1>팬 커뮤니티</h1>
            <p>경기부터 직관 후기까지, 마드리디스타의 이야기</p>
          </header>

          <section className={styles.feed} aria-label={`${selectedBoard.label} 게시판`}>
            <div className={styles.controls}>
              <div className={styles.tabs} aria-label="게시판 분류">
                {communityBoards.map((item) => (
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
              <label className={styles.search}>
                <span className={styles.srOnly}>글 제목 검색</span>
                <input
                  type="search"
                  value={query}
                  placeholder="글 제목 검색"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            <p className={styles.previewNote}>게시판 미리보기 · 아래 글은 예시입니다</p>
            {posts.length === 0 ? (
              <p className={styles.emptyState} role="status">검색 조건에 맞는 글이 없어요</p>
            ) : (
              <div className={styles.postList}>
                {posts.map((post) => (
                  <Link className={styles.postRow} href={`/community/${post.id}`} key={post.id}>
                    <span className={styles.category}>{communityBoards.find((item) => item.id === post.board)?.label}</span>
                    <span className={styles.postContent}>
                      <b>{post.title}</b>
                      <small>{post.summary}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
