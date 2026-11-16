"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

const boardOptions = [
  { value: "match_discussion", label: "경기 토론" },
  { value: "tactics_players", label: "전술·선수" },
  { value: "free_chat", label: "자유·잡담" },
];

export default function NewCommunityPostPage() {
  const router = useRouter();
  const { supabase, user } = useAuth();
  const [board, setBoard] = useState("match_discussion");
  const [matchId, setMatchId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedBoard = params.get("board");
    if (boardOptions.some((option) => option.value === requestedBoard)) setBoard(requestedBoard!);
    setMatchId(params.get("matchId") ?? "");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    setError("");
    const { data, error: insertError } = await supabase.from("posts").insert({
      author_id: user.id,
      board,
      match_id: board === "match_discussion" ? (matchId.trim() || null) : null,
      title: title.trim(),
      body: body.trim(),
    }).select("id").single();
    if (insertError) {
      setError("게시글을 저장하지 못했습니다. SQL 정책과 Supabase 연결을 확인해 주세요.");
      setSaving(false);
      return;
    }
    router.replace(`/community/${data.id}`);
  }

  return (
    <>
      <SiteHeader />
      <main className="inner-page compose-page">
        <div className="page-width">
          <Link className="back-link" href="/community">← 팬라운지</Link>
          <header className="inner-page-heading"><div className="eyebrow"><span /> YOUR TURN</div><h1>새 이야기</h1><p>경기 이야기와 일상 잡담을 나눠보세요.</p></header>
          {!supabase ? (
            <div className="page-state">Supabase 설정 후 게시글을 작성할 수 있습니다.</div>
          ) : !user ? (
            <div className="page-state">글쓰기는 로그인한 팬만 사용할 수 있습니다. <Link href="/auth">로그인하기 →</Link></div>
          ) : (
            <form className="compose-form" onSubmit={submit}>
              <label>게시판<select value={board} onChange={(event) => setBoard(event.target.value)}>{boardOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              {board === "match_discussion" && <label>경기 ID <input value={matchId} onChange={(event) => setMatchId(event.target.value)} placeholder="매치센터 경기 상세에서 연결" /></label>}
              <label>제목<input required minLength={2} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>내용<textarea required minLength={2} maxLength={12000} rows={10} value={body} onChange={(event) => setBody(event.target.value)} /></label>
              {error && <p className="form-message" role="alert">{error}</p>}
              <div className="compose-actions"><Link href="/community">취소</Link><button className="form-submit" type="submit" disabled={saving}>{saving ? "저장 중…" : "게시하기"}</button></div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
