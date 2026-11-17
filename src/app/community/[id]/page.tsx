import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoardCopy } from "@/lib/community-board-copy";
import { communityBoards, communityExamples } from "@/lib/community-examples";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = communityExamples.find((item) => item.id === id);
  const board = communityBoards.find((item) => item.id === post?.board);
  const copy = communityBoardCopy[id];

  return (
    <>
      <SiteHeader />
      <main className="inner-page community-detail-page">
        <div className="page-width">
          <Link className="back-link" href="/community">← 팬 커뮤니티</Link>
          {!post ? (
            <div className="page-state">예시 게시글을 찾을 수 없습니다.</div>
          ) : (
            <article className="post-detail">
              <div className="post-detail-meta">
                <span className="board-label">{board?.label}</span>
                <span className="example-label">예시 글</span>
              </div>
              <h1>{copy?.title ?? post.title}</h1>
              <div className="post-body">{copy?.body ?? post.body}</div>
            </article>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
