"use client";

import { useState, type FormEvent } from "react";
import {
  scoutPositions, scoutProfiles,
  type ScoutPosition, type ScoutProfile, type ScoutResult,
} from "@/lib/scout";
import styles from "./squad.module.css";

export function ScoutPanel() {
  const [position, setPosition] = useState<ScoutPosition>("defender");
  const [profile, setProfile] = useState<ScoutProfile>("youth");
  const [result, setResult] = useState<(ScoutResult & { position: ScoutPosition; profile: ScoutProfile }) | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/scout?" + new URLSearchParams({ position, profile }), { cache: "no-store" });
      const data = await response.json() as ScoutResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "후보를 불러오지 못했어요.");
      setResult({ ...data, position, profile });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "후보를 불러오지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.scout} aria-labelledby="scout-title">
      <div className={styles.scoutHeading}>
        <div>
          <p className={styles.scoutEyebrow}>MADRIDISTA SCOUTING</p>
          <h2 id="scout-title">영입 스카우트</h2>
          <p>레알 마드리드에 필요한 자리를 골라, 라리가 타 구단의 보강 후보를 찾아보세요.</p>
        </div>
        <span className={styles.scoutScope}>LALIGA · 구단 4곳</span>
      </div>

      <form className={styles.scoutForm} onSubmit={search}>
        <label>
          보강 포지션
          <select disabled={pending} value={position} onChange={(event) => setPosition(event.target.value as ScoutPosition)}>
            {Object.entries(scoutPositions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>
          영입 기준
          <select disabled={pending} value={profile} onChange={(event) => setProfile(event.target.value as ScoutProfile)}>
            {Object.entries(scoutProfiles).map(([key, item]) => <option key={key} value={key}>{item.label} · {item.range}</option>)}
          </select>
        </label>
        <button disabled={pending} type="submit">{pending ? "후보 찾는 중…" : "영입 후보 찾기"}</button>
      </form>

      {pending && <p className={styles.scoutSource} role="status">구단 명단을 확인하고 있어요.</p>}
      {error && <p className={styles.scoutNotice} role="alert">{error}</p>}
      {result && (
        <div className={styles.scoutResults} aria-live="polite">
          <p className={styles.scoutResultTitle}>
            {scoutPositions[result.position]} · {scoutProfiles[result.profile].label} <span>{result.players.length}명</span>
          </p>
          {result.scannedClubs < result.targetClubs && (
            <p className={styles.scoutNotice}>접근 가능한 {result.scannedClubs}개 구단 명단만 반영했어요.</p>
          )}
          {result.players.length ? (
            <ul className={styles.scoutCards}>
              {result.players.map((player) => (
                <li key={player.id}>
                  <p className={styles.scoutClub}>{player.club}</p>
                  <h3>{player.name}</h3>
                  <p className={styles.scoutReason}>{scoutPositions[result.position]} · 만 {player.age}세</p>
                  <p className={styles.scoutBasis}>선택한 연령 조건({scoutProfiles[result.profile].range})에 해당해요.</p>
                </li>
              ))}
            </ul>
          ) : <p className={styles.scoutNotice}>조건에 맞는 후보가 없어요. 포지션이나 연령대를 바꿔보세요.</p>}
        </div>
      )}
      <p className={styles.scoutSource}>출처: football-data.org 구단 명단. 포지션·연령으로 선별하며, 경기력이나 실제 이적 가능성을 평가하지 않아요.</p>
    </section>
  );
}
