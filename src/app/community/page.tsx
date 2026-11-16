"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoards, communityExamples, type CommunityBoardId } from "@/lib/community-examples";

export default function CommunityPage() {
  const [board, setBoard] = useState<CommunityBoardId>("match_discussion");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("board");
    if (communityBoards.some((item) => item.id === requested)) {
      setBoard(requested as CommunityBoardId);
    }
  }, []);

  const selectedBoard = communityBoards.find((item) => item.id === board) ?? communityBoards[0];
  const posts = communityExamples.filter((post) => post.board === board);

  return (
    <>
      <SiteHeader />
      <main className="inner-page community-page">
        <div className="page-width">
          <header className="inner-page-heading community-heading">
            <div>
              <div className="eyebrow"><span /> OPEN STANDS</div>
              <h1>팬라운지</h1>
              <p>경기와 전술, 유니폼과 일상까지. 마드리디스타의 이야기를 둘러보세요.</p>
            </div>
            <span className="community-preview-note">둘러보기용 미리보기</span>
          </header>

          <div className="community-layout">
            <aside className="board-rail" aria-label="게시판 선택">
              <span className="rail-label">BOARDS</span>
              {communityBoards.map((item) => (
                <button
                  type="button"
                  className={board === item.id ? "active" : ""}
                  key={item.id}
                  aria-pressed={board === item.id}
                  onClick={() => setBoard(item.id)}
                >
                  <b>{item.label}</b><small>{item.hint}</small>
                </button>
              ))}
              <div className="board-guideline">
                <strong>자유·잡담도 환영해요</strong>
                <p>유니폼, 직관 후기와 일상 이야기를 나누는 공개 게시판입니다. 아래 글은 모두 예시입니다.</p>
              </div>
            </aside>

            <section className="community-feed" aria-labelledby="community-feed-title">
              <div className="feed-heading">
                <div>
                  <span className="eyebrow"><span /> {selectedBoard.label.toUpperCase()}</span>
                  <h2 id="community-feed-title">{selectedBoard.label}</h2>
                  <p>{selectedBoard.hint}</p>
                </div>
                <span className="example-label">예시 게시글</span>
              </div>
              <div className="post-list">
                {posts.map((post) => (
                  <Link className="post-row" href={`/community/${post.id}`} key={post.id}>
                    <span className="post-category">예시 게시글</span>
                    <span className="post-row-main">
                      <b>{post.title}</b>
                      <small>{post.summary}</small>
                    </span>
                    <span className="post-example-mark">예시</span>
                  </Link>
                ))}
              </div>
              <p className="community-disclaimer">표시된 글은 화면 미리보기를 위한 예시이며 실제 팬이 작성한 게시글이나 댓글이 아닙니다.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
