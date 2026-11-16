"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

export default function AuthPage() {
  const router = useRouter();
  const { supabase, user, nickname } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function returnPath() {
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? next : "/";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!supabase) return setMessage("Supabase 설정이 완료되지 않았습니다.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) router.replace(returnPath());
        else setMessage("가입 요청이 완료됐습니다. 이메일 인증 후 로그인해 주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace(returnPath());
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 요청을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="inner-page auth-page page-width">
        <section className="auth-intro">
          <div className="eyebrow"><span /> MADRIDISTA MEMBERS</div>
          <h1>{user ? "다시 만나서 반가워요." : mode === "signin" ? "팬라운지에\n입장하세요." : "마드리디스타로\n함께해요."}</h1>
          <p>경기 토론과 전술, 유니폼과 직관 이야기까지 팬들과 나눠보세요.</p>
          <Link href="/community">팬라운지 둘러보기 →</Link>
        </section>

        <section className="auth-panel" aria-label="로그인 및 가입">
          {user ? (
            <div className="auth-signed-in">
              <span className="panel-overline">SIGNED IN</span>
              <h2>{nickname ?? user.email}</h2>
              <p>로그인되어 있습니다.</p>
              <Link className="form-submit" href="/community">팬라운지로 이동</Link>
            </div>
          ) : (
            <>
              <div className="auth-tabs">
                <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setMessage(""); }}>로그인</button>
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>가입하기</button>
              </div>
              {!supabase ? (
                <div className="auth-config-message">
                  <h2>팬라운지 연결 준비 중</h2>
                  <p>관리자가 Supabase 프로젝트와 공개 URL/anon key를 설정하면 로그인과 글쓰기를 사용할 수 있습니다.</p>
                </div>
              ) : (
                <form className="auth-form" onSubmit={submit}>
                  {mode === "signup" && <label>닉네임<input required minLength={2} maxLength={24} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" /></label>}
                  <label>이메일<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
                  <label>비밀번호<input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
                  {message && <p className="form-message" role="status">{message}</p>}
                  <button className="form-submit" type="submit" disabled={busy}>{busy ? "처리 중…" : mode === "signin" ? "로그인" : "계정 만들기"}</button>
                </form>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
