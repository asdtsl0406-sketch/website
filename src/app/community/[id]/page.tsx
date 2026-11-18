import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoardCopy } from "@/lib/community-board-copy";
import { communityBoards, communityExamples } from "@/lib/community-examples";
import { formatCommunityPostDate, getCommunityBoardLabel } from "@/lib/community-posts";
import { getPublicCommunityPost } from "@/lib/community-repository.server";

export const dynamic = "force-dynamic";

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = communityExamples.find((item) => item.id === id);

  if (example) {
    const board = communityBoards.find((item) => item.id === example.board);
    const copy = communityBoardCopy[id];

    return (
      <>
        <SiteHeader />
        <main className="inner-page community-detail-page">
          <div className="page-width">
            <Link className="back-link" href="/community">← 팬 커뮤니티</Link>
            <article className="post-detail">
              <div className="post-detail-meta">
                <span className="board-label">{board?.label}</span>
                <span className="example-label">예시 글</span>
              </div>
              <h1>{copy?.title ?? example.title}</h1>
              <div className="post-body">{copy?.body ?? example.body}</div>
            </article>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const result = await getPublicCommunityPost(id);
  const createdLabel = result.ok && result.post
    ? formatCommunityPostDate(result.post.createdAt)
    : "";

  return (
    <>
      <SiteHeader />
      <main className="inner-page community-detail-page">
        <div className="page-width">
          <Link className="back-link" href="/community">← 팬 커뮤니티</Link>
          {!result.ok ? (
            <div className="page-state error">
              {result.reason === "not_configured"
                ? "서버에 SUPABASE_URL과 SUPABASE_SECRET_KEY가 설정되지 않아 게시글을 불러올 수 없습니다."
                : "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
            </div>
          ) : !result.post ? (
            <div className="page-state">게시글을 찾을 수 없습니다.</div>
          ) : (
            <article className="post-detail">
              <div className="post-detail-meta">
                <span className="board-label">{getCommunityBoardLabel(result.post.board)}</span>
              </div>
              <h1>{result.post.title}</h1>
              <div className="post-author-line">
                <span>익명</span>
                {createdLabel && <span>{createdLabel}</span>}
              </div>
              <div className="post-body">{result.post.body}</div>
            </article>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
