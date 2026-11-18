import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublicCommunityPosts } from "@/lib/community-repository.server";
import { CommunityFeed } from "./community-feed";
import styles from "./community.module.css";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const result = await listPublicCommunityPosts();
  const posts = result.ok ? result.posts : [];
  const storeNotice = result.ok
    ? null
    : result.reason === "not_configured"
      ? "서버에 SUPABASE_URL과 SUPABASE_SECRET_KEY가 설정되지 않아 실제 게시글을 불러오거나 저장할 수 없습니다. 아래 예시 글은 화면 확인용입니다."
      : result.reason === "network"
        ? "Supabase에 연결하지 못했습니다. SUPABASE_URL과 Supabase 프로젝트가 Paused 상태가 아닌지 확인해주세요. 아래 예시 글은 화면 확인용입니다."
        : "게시글을 불러오지 못했습니다. 잠시 후 새로고침해주세요.";

  return (
    <>
      <SiteHeader />
      <main className={`inner-page ${styles.page}`}>
        <div className="page-width">
          <header className={styles.heading}>
            <h1>팬 커뮤니티</h1>
            <p>경기부터 직관 후기까지, 마드리디스타의 이야기</p>
          </header>

          <CommunityFeed posts={posts} storeNotice={storeNotice} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
