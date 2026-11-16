"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";

type Report = { id: string; reporter_id: string; target_type: "post" | "comment"; target_id: string; reason: string; status: string; created_at: string; reporterName: string; excerpt: string };

export default function ModerationPage() {
  const { supabase, user, isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadReports = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("content_reports").select("id,reporter_id,target_type,target_id,reason,status,created_at").eq("status", "pending").order("created_at", { ascending: false });
    if (error || !data?.length) {
      setReports([]);
      setLoading(false);
      return;
    }
    const postIds = data.filter((report) => report.target_type === "post").map((report) => report.target_id);
    const commentIds = data.filter((report) => report.target_type === "comment").map((report) => report.target_id);
    const [{ data: posts }, { data: comments }] = await Promise.all([
      postIds.length ? supabase.from("posts").select("id,title,body,author_id").in("id", postIds) : Promise.resolve({ data: [] }),
      commentIds.length ? supabase.from("comments").select("id,body,author_id").in("id", commentIds) : Promise.resolve({ data: [] }),
    ]);
    const content = new Map<string, { excerpt: string; authorId: string }>();
    (posts ?? []).forEach((post) => content.set(post.id, { excerpt: post.title, authorId: post.author_id }));
    (comments ?? []).forEach((comment) => content.set(comment.id, { excerpt: comment.body, authorId: comment.author_id }));
    const profileIds = [...new Set([...data.map((report) => report.reporter_id), ...[...content.values()].map((item) => item.authorId)])];
    const { data: profiles } = await supabase.from("profiles").select("id,nickname").in("id", profileIds);
    const nicknames = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));
    setReports(data.map((report) => ({
      ...report,
      reporterName: nicknames.get(report.reporter_id) ?? "팬",
      excerpt: content.get(report.target_id)?.excerpt ?? "원본 콘텐츠가 삭제되었습니다.",
    })));
    setLoading(false);
  }, [supabase, isAdmin]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  async function review(report: Report, hide: boolean) {
    if (!supabase || !isAdmin) return;
    setMessage("");
    if (hide) {
      const table = report.target_type === "post" ? "posts" : "comments";
      const { error } = await supabase.from(table).update({ status: "hidden", updated_at: new Date().toISOString() }).eq("id", report.target_id);
      if (error) return setMessage("콘텐츠를 숨기지 못했습니다.");
    }
    const { error } = await supabase.from("content_reports").update({ status: hide ? "reviewed" : "dismissed" }).eq("id", report.id);
    if (error) return setMessage("신고 상태를 저장하지 못했습니다.");
    setMessage(hide ? "콘텐츠를 숨기고 신고를 처리했습니다." : "신고를 검토 완료 처리했습니다.");
    await loadReports();
  }

  return (
    <>
      <SiteHeader />
      <main className="inner-page moderation-page">
        <div className="page-width">
          <Link className="back-link" href="/community">← 팬라운지</Link>
          <header className="inner-page-heading"><div className="eyebrow"><span /> MODERATION DESK</div><h1>신고 관리</h1><p>운영자만 볼 수 있는 팬라운지 신고 목록입니다.</p></header>
          {!supabase ? <div className="page-state">Supabase 설정이 필요합니다.</div> : !user || !isAdmin ? <div className="page-state">운영자 계정으로 로그인해야 볼 수 있습니다.</div> : loading ? <div className="page-state">신고를 불러오는 중입니다.</div> : reports.length === 0 ? <div className="page-state">대기 중인 신고가 없습니다.</div> : (
            <div className="reports-list">
              {reports.map((report) => (
                <article className="report-row" key={report.id}>
                  <div><span className="board-label">{report.target_type === "post" ? "게시글" : "댓글"}</span><h2>{report.excerpt}</h2><p>신고 사유: {report.reason}</p><small>신고자 {report.reporterName} · {new Date(report.created_at).toLocaleString("ko-KR")}</small></div>
                  <div className="report-actions"><button onClick={() => void review(report, true)}>숨기고 처리</button><button onClick={() => void review(report, false)}>문제 없음</button></div>
                </article>
              ))}
            </div>
          )}
          {message && <p className="form-message" role="status">{message}</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
