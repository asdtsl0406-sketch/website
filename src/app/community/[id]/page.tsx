"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ReportControl } from "@/components/report-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

type Post = { id: string; title: string; body: string; board: string; match_id: string | null; author_id: string; status: string; created_at: string; nickname: string };
type Comment = { id: string; post_id: string; author_id: string; body: string; status: string; created_at: string; nickname: string };

const boardLabels: Record<string, string> = {
  match_discussion: "경기 토론",
  tactics_players: "전술·선수",
  free_chat: "자유·잡담",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>();
  const { supabase, user, isAdmin } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");

  const loadPost = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id,title,body,board,match_id,author_id,status,created_at")
      .eq("id", id)
      .maybeSingle();
    if (postError || !postData) {
      setError("게시글을 찾을 수 없거나 숨김 처리되었습니다.");
      setPost(null);
      setComments([]);
      setLoading(false);
      return;
    }
    const { data: commentRows } = await supabase
      .from("comments")
      .select("id,post_id,author_id,body,status,created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    const authorIds = [...new Set([postData.author_id, ...(commentRows ?? []).map((row) => row.author_id)])];
    const { data: profiles } = await supabase.from("profiles").select("id,nickname").in("id", authorIds);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));
    setPost({ ...postData, nickname: names.get(postData.author_id) ?? "마드리디스타" });
    setComments((commentRows ?? []).map((row) => ({ ...row, nickname: names.get(row.author_id) ?? "마드리디스타" })));
    setEditTitle(postData.title);
    setEditBody(postData.body);
    setError("");
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { void loadPost(); }, [loadPost]);

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const { error: insertError } = await supabase.from("comments").insert({ post_id: id, author_id: user.id, body: commentBody.trim() });
    if (insertError) { setError("댓글을 저장하지 못했습니다."); return; }
    setCommentBody("");
    await loadPost();
  }

  async function savePostEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || !post) return;
    const { error: updateError } = await supabase.from("posts").update({ title: editTitle.trim(), body: editBody.trim(), updated_at: new Date().toISOString() }).eq("id", post.id);
    if (updateError) { setError("게시글을 수정하지 못했습니다."); return; }
    setEditingPost(false);
    await loadPost();
  }

  async function saveCommentEdit(commentId: string) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("comments").update({ body: editCommentBody.trim(), updated_at: new Date().toISOString() }).eq("id", commentId);
    if (updateError) { setError("댓글을 수정하지 못했습니다."); return; }
    setEditingComment(null);
    await loadPost();
  }

  async function removeContent(kind: "posts" | "comments", contentId: string) {
    if (!supabase || !window.confirm("이 글을 삭제할까요?")) return;
    const { error: deleteError } = await supabase.from(kind).delete().eq("id", contentId);
    if (deleteError) { setError("삭제하지 못했습니다."); return; }
    await loadPost();
  }

  async function moderate(kind: "posts" | "comments", contentId: string, status: string) {
    if (!supabase || !isAdmin) return;
    const { error: updateError } = await supabase.from(kind).update({ status, updated_at: new Date().toISOString() }).eq("id", contentId);
    if (updateError) { setError("운영자 처리를 완료하지 못했습니다."); return; }
    await loadPost();
  }

  return (
    <>
      <SiteHeader />
      <main className="inner-page community-detail-page">
        <div className="page-width">
          <Link className="back-link" href={`/community${post ? `?board=${post.board}${post.match_id ? `&matchId=${post.match_id}` : ""}` : ""}`}>← 팬라운지</Link>
          {!supabase ? <div className="page-state">Supabase 설정 후 게시글을 볼 수 있습니다.</div> : loading ? <div className="page-state">게시글을 불러오는 중입니다.</div> : !post ? <div className="page-state">{error || "게시글을 찾을 수 없습니다."}</div> : (
            <>
              <article className="post-detail">
                <div className="post-detail-meta"><span className="board-label">{boardLabels[post.board] ?? post.board}</span><span>{formatDate(post.created_at)}</span>{post.status === "hidden" && <span className="hidden-label">운영자 숨김</span>}</div>
                {editingPost ? (
                  <form className="edit-content-form" onSubmit={savePostEdit}>
                    <input required minLength={2} maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    <textarea required minLength={2} maxLength={12000} rows={9} value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                    <button className="form-submit" type="submit">수정 저장</button>
                    <button className="quiet-button" type="button" onClick={() => setEditingPost(false)}>취소</button>
                  </form>
                ) : (
                  <>
                    <h1>{post.title}</h1>
                    <div className="post-author-line"><span>{post.nickname}</span>{post.author_id === user?.id && <button className="quiet-button" onClick={() => setEditingPost(true)}>수정</button>}{(post.author_id === user?.id || isAdmin) && <button className="quiet-button" onClick={() => void removeContent("posts", post.id)}>삭제</button>}{isAdmin && <button className="quiet-button" onClick={() => void moderate("posts", post.id, post.status === "hidden" ? "visible" : "hidden")}>{post.status === "hidden" ? "다시 공개" : "숨김 처리"}</button>}<ReportControl targetType="post" targetId={post.id} /></div>
                    {post.match_id && <Link className="match-context-link" href={`/matches/${post.match_id}`}>연결된 경기 보기 →</Link>}
                    <div className="post-body">{post.body}</div>
                  </>
                )}
              </article>

              {error && <p className="form-message" role="status">{error}</p>}
              <section className="comments-section">
                <div className="match-list-heading"><div><div className="eyebrow"><span /> THE CONVERSATION</div><h2>댓글 <span>{comments.length}</span></h2></div></div>
                {comments.length === 0 ? <p className="empty-copy">아직 댓글이 없습니다. 첫 의견을 남겨보세요.</p> : (
                  <div className="comment-list">
                    {comments.map((comment) => (
                      <article className={`comment-row ${comment.status === "hidden" ? "comment-hidden" : ""}`} key={comment.id}>
                        <div className="comment-meta"><b>{comment.nickname}</b><time>{formatDate(comment.created_at)}</time>{comment.status === "hidden" && <span className="hidden-label">숨김</span>}</div>
                        {editingComment === comment.id ? (
                          <div className="edit-content-form"><textarea rows={4} value={editCommentBody} onChange={(event) => setEditCommentBody(event.target.value)} /><button className="quiet-button" onClick={() => void saveCommentEdit(comment.id)}>저장</button><button className="quiet-button" onClick={() => setEditingComment(null)}>취소</button></div>
                        ) : <p>{comment.body}</p>}
                        <div className="comment-actions">{comment.author_id === user?.id && <><button className="quiet-button" onClick={() => { setEditingComment(comment.id); setEditCommentBody(comment.body); }}>수정</button><button className="quiet-button" onClick={() => void removeContent("comments", comment.id)}>삭제</button></>}{isAdmin && <button className="quiet-button" onClick={() => void moderate("comments", comment.id, comment.status === "hidden" ? "visible" : "hidden")}>{comment.status === "hidden" ? "다시 공개" : "숨김 처리"}</button>}<ReportControl targetType="comment" targetId={comment.id} /></div>
                      </article>
                    ))}
                  </div>
                )}
                {user ? (
                  <form className="comment-form" onSubmit={addComment}><label htmlFor="comment-body">댓글 쓰기</label><textarea id="comment-body" required maxLength={4000} rows={4} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} /><button className="form-submit" type="submit">댓글 등록</button></form>
                ) : <div className="comment-signin"><Link href={`/auth?next=/community/${post.id}`}>로그인 후 댓글을 남길 수 있습니다.</Link></div>}
              </section>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
