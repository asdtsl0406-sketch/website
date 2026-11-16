"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function ReportControl({ targetType, targetId }: { targetType: "post" | "comment"; targetId: string }) {
  const { supabase, user } = useAuth();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim(),
    });
    setMessage(error ? "신고를 저장하지 못했습니다." : "운영자에게 신고를 전달했습니다.");
    if (!error) setReason("");
    setBusy(false);
  }

  if (!user) return <Link className="report-link" href="/auth">로그인 후 신고</Link>;
  if (!supabase) return null;

  return (
    <details className="report-control">
      <summary>신고</summary>
      <form onSubmit={submit}>
        <label>신고 사유<textarea required minLength={2} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "전달 중…" : "신고 보내기"}</button>
        {message && <span role="status">{message}</span>}
      </form>
    </details>
  );
}
