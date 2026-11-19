import Link from "next/link";
import { cookies } from "next/headers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { communityBoardCopy } from "@/lib/community-board-copy";
import { communityBoards, communityExamples } from "@/lib/community-examples";
import { formatCommunityPostDate, getCommunityBoardLabel } from "@/lib/community-posts";
import {
  getCommunityPostVotes,
  getPublicCommunityPost,
  isCommunityPostOwner,
} from "@/lib/community-repository.server";
import { COMMUNITY_VISITOR_COOKIE, isCommunityVisitorId } from "@/lib/community-visitor";
import { hashCommunityVisitorId } from "@/lib/community-visitor.server";
import { CommunityDeleteButton } from "./community-delete-button";
import { CommunityVoteBar } from "./community-vote-bar";
import styles from "../community.module.css";

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
        <main className={`inner-page community-detail-page ${styles.page}`}>
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

  const visitorId = (await cookies()).get(COMMUNITY_VISITOR_COOKIE)?.value;
  const voterHash = isCommunityVisitorId(visitorId) ? hashCommunityVisitorId(visitorId) : null;

  const result = await getPublicCommunityPost(id);

  let votes = null;
  let isOwner = false;

  if (result.ok && result.post) {
    const [voteResult, owner] = await Promise.all([
      getCommunityPostVotes(result.post.id, voterHash),
      voterHash
        ? isCommunityPostOwner(result.post.id, voterHash)
        : Promise.resolve(false),
    ]);

    // A failed aggregate read stays unavailable instead of looking like 0 votes.
    votes = voteResult.ok ? voteResult.summary : null;
    isOwner = owner;
  }

  const createdLabel = result.ok && result.post
    ? formatCommunityPostDate(result.post.createdAt)
    : "";

  return (
    <>
      <SiteHeader />
      <main className={`inner-page community-detail-page ${styles.page}`}>
        <div className="page-width">
          <Link className="back-link" href="/community">← 팬 커뮤니티</Link>
          {!result.ok ? (
            <div className="page-state error">
              {result.reason === "not_configured"
                ? "서버에 SUPABASE_URL과 SUPABASE_SECRET_KEY가 설정되지 않아 게시글을 불러올 수 없습니다."
                : result.reason === "network"
                  ? "Supabase에 연결하지 못했습니다. SUPABASE_URL과 Supabase 프로젝트 상태를 확인해주세요."
                  : "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
            </div>
          ) : !result.post ? (
            <div className="page-state">게시글을 찾을 수 없습니다.</div>
          ) : (
            <article className="post-detail">
              <div className={styles.detailTop}>
                <span className="board-label">{getCommunityBoardLabel(result.post.board)}</span>
                {isOwner && <CommunityDeleteButton postId={result.post.id} />}
              </div>
              <h1>{result.post.title}</h1>
              <div className="post-author-line">
                <span>익명</span>
                {createdLabel && <span>{createdLabel}</span>}
              </div>
              <div className="post-body">{result.post.body}</div>
              <CommunityVoteBar
                postId={result.post.id}
                initialUp={votes?.up ?? 0}
                initialDown={votes?.down ?? 0}
                initialVote={votes?.myVote ?? "none"}
                available={votes !== null}
              />
            </article>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
