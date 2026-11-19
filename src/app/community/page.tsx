import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listCommunityVoteSummaries,
  listPublicCommunityPosts,
} from "@/lib/community-repository.server";
import { CommunityFeed } from "./community-feed";
import { CommunityMatchCard } from "./community-match-card";
import styles from "./community.module.css";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const result = await listPublicCommunityPosts();
  const posts = result.ok ? result.posts : [];

  // One aggregate request for every post on the page.
  const voteResult = result.ok ? await listCommunityVoteSummaries(posts.map((post) => post.id)) : null;
  const votes = voteResult?.ok ? voteResult.votes : null;

  const storeNotice = result.ok ? null : "지금은 팬 글을 불러올 수 없어요. 잠시 후 새로고침해 주세요.";

  return (
    <>
      <SiteHeader />
      <main className={`inner-page ${styles.page}`}>
        <div className="page-width">
          <header className={styles.heading}>
            <h1>팬 커뮤니티</h1>
            <p>경기부터 직관 후기까지, 마드리디스타의 이야기</p>
          </header>

          <CommunityMatchCard />
          <CommunityFeed posts={posts} votes={votes} storeNotice={storeNotice} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
