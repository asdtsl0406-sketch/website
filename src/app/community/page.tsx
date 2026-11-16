"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

const boards = [
  { id: "match_discussion", label: "경기 토론", hint: "경기 전·후 생각을 나눠요" },
  { id: "tactics_players", label: "전술·선수", hint: "포메이션과 선수 이야기를 해요" },
  { id: "free_chat", label: "자유·잡담", hint: "유니폼·직관·일상 이야기도 환영" },
];

type CommunityPost = {
  id: string;
  title: string;
  body: string;
  board: string;
  match_id: string | null;
  created_at: string;
  author_id: string;
  nickname: string;
  commentCount: number;
};

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function CommunityPage() {
  const { supabase, user, isAdmin } = useAuth();
  const [board, setBoard] = useState("match_discussion");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedBoard = params.get("board");
    if (boards.some((item) => item.id === requestedBoard)) setBoard(requestedBoard!);
    setMatchId(params.get("matchId"));
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setPosts([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    async function loadPosts(db: NonNullable<typeof supabase>) {
      let query = db
        .from("posts")
        .select("id,title,body,board,match_id,created_at,author_id")
        .eq("status", "visible")
        .eq("board", board)
        .order("created_at", { ascending: false })
        .limit(50);
      if (board === "match_discussion" && matchId) query = query.eq("match_id", matchId);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const rows = data ?? [];
      if (!rows.length) {
        if (active) setPosts([]);
        return;
      }
      const postIds = rows.map((post) => post.id);
      const authorIds = [...new Set(rows.map((post) => post.author_id))];
      const [{ data: profiles }, { data: comments }] = await Promise.all([
        db.from("profiles").select("id,nickname").in("id", authorIds),
        db.from("comments").select("post_id").eq("status", "visible").in("post_id", postIds),
      ]);
      const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));
      const commentCounts = new Map<string, number>();
      (comments ?? []).forEach((comment) => commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1));
      if (active) setPosts(rows.map((post) => ({
        ...post,
        nickname: names.get(post.author_id) ?? "마드리디스타",
        commentCount: commentCounts.get(post.id) ?? 0,
      })));
    }
    void loadPosts(client).catch((cause) => {
      if (active) setError(cause instanceof Error ? "게시글을 불러오지 못했습니다." : "팬라운지 연결을 확인해 주세요.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [supabase, board, matchId]);

  const selectedBoard = boards.find((item) => item.id === board) ?? boards[0];

  return (
    <>
      <SiteHeader />
      <main className="inner-page community-page">
        <div className="page-width">
          <header className="inner-page-heading community-heading">
            <div><div className="eyebrow"><span /> OPEN STANDS</div><h1>팬라운지</h1><p>경기와 전술, 유니폼과 일상까지. 마드리디스타의 이야기가 모이는 곳.</p></div>
            {isAdmin && <Link className="admin-link" href="/community/moderation">신고 관리</Link>}
          </header>

          <div className="community-layout">
            <aside className="board-rail" aria-label="게시판 선택">
              <span className="rail-label">BOARDS</span>
              {boards.map((item) => (
                <button className={board === item.id ? "active" : ""} key={item.id} onClick={() => { setBoard(item.id); setMatchId(null); }}>
                  <b>{item.label}</b><small>{item.hint}</small>
                </button>
              ))}
              <div className="board-guideline"><strong>팬라운지 이용</strong><p>서로 존중하며 이야기해요. 게시글과 댓글은 로그인한 팬만 작성할 수 있습니다.</p></div>
            </aside>

            <section className="community-feed" aria-labelledby="community-feed-title">
              <div className="feed-heading">
                <div><span className="eyebrow"><span /> {selectedBoard.label.toUpperCase()}</span><h2 id="community-feed-title">{selectedBoard.label}</h2>{matchId && <p>선택한 경기 토론</p>}</div>
                {user ? <Link className="compose-button" href={`/community/new?board=${board}${matchId ? `&matchId=${encodeURIComponent(matchId)}` : ""}`}>글쓰기 <span>＋</span></Link> : <Link className="compose-button" href="/auth">로그인 후 글쓰기</Link>}
              </div>
              {!supabase ? (
                <div className="page-state">Supabase 설정 후 실제 팬 게시글이 이곳에 표시됩니다.</div>
              ) : loading ? (
                <div className="page-state">게시글을 불러오는 중입니다.</div>
              ) : error ? (
                <div className="page-state error">{error}</div>
              ) : posts.length === 0 ? (
                <div className="community-empty"><span>✳</span><h3>아직 게시글이 없습니다.</h3><p>{selectedBoard.hint}. 첫 이야기를 남겨보세요.</p>{user && <Link href={`/community/new?board=${board}`}>첫 글 쓰기 →</Link>}</div>
              ) : (
                <div className="post-list">
                  {posts.map((post) => (
                    <Link className="post-row" href={`/community/${post.id}`} key={post.id}>
                      <span className="post-category">{boards.find((item) => item.id === post.board)?.label ?? post.board}</span>
                      <span className="post-row-main"><b>{post.title}</b><small>{post.nickname} · {formatPostDate(post.created_at)}</small></span>
                      <span className="post-comments"><span>댓글</span><b>{post.commentCount}</b></span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
