import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoards, communityExamples } from "@/lib/community-examples";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = communityExamples.find((item) => item.id === id);
  const board = communityBoards.find((item) => item.id === post?.board);

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
                <span className="example-label">예시 게시글</span>
              </div>
              <h1>{post.title}</h1>
              <p className="post-example-note">커뮤니티 둘러보기를 위한 예시 콘텐츠입니다. 실제 팬의 게시글이 아닙니다.</p>
              <div className="post-body">{post.body}</div>
            </article>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
