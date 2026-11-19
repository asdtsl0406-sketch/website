"use client";

import { useState, type FormEvent } from "react";
import {
  scoutLeagueOptions, scoutLeagues, scoutPositions, scoutResultLimit, scoutRoleLabel, scoutRolesByPosition,
  type ScoutLeagueOption, type ScoutPlayer, type ScoutPosition, type ScoutRoleOption, type ScoutResult,
} from "@/lib/scout";
import { ScoutPlayerDialog } from "./scout-player-dialog";
import styles from "./squad.module.css";

export function ScoutPanel() {
  const [league, setLeague] = useState<ScoutLeagueOption>("PD");
  const [position, setPosition] = useState<ScoutPosition>("defender");
  const [role, setRole] = useState<ScoutRoleOption>("all");
  const [result, setResult] = useState<(ScoutResult & { league: ScoutLeagueOption; position: ScoutPosition; role: ScoutRoleOption }) | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: ScoutPlayer; position: ScoutPosition } | null>(null);

  async function searchFor(selectedRole: ScoutRoleOption) {
    setPending(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/scout?" + new URLSearchParams({ league, position, role: selectedRole }), { cache: "no-store" });
      const data = await response.json().catch(() => null) as (ScoutResult & { error?: string }) | null;
      if (!response.ok || !data || !Array.isArray(data.players)) {
        throw new Error(data?.error || "후보를 불러오지 못했어요.");
      }
      setResult({ ...data, league, position, role: selectedRole });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "후보를 불러오지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchFor(role);
  }

  function searchBroadPosition() {
    setRole("all");
    void searchFor("all");
  }

  return (
    <section className={styles.scout} aria-labelledby="scout-title">
      <div className={styles.scoutHeading}>
        <div>
          <p className={styles.scoutEyebrow}>MADRIDISTA SCOUTING</p>
          <h2 id="scout-title">영입 스카우트</h2>
          <p>레알은 어디를 보강해야 할까요? 5대 리그에서 후보를 찾아보고 영입 얘기를 나눠보세요.</p>
        </div>
        <span className={styles.scoutScope}>유럽 5대 리그</span>
      </div>

      <form className={styles.scoutForm} onSubmit={search}>
        <label>
          검색 리그
          <select disabled={pending} value={league} onChange={(event) => {
            setLeague(event.target.value as ScoutLeagueOption);
            setRole("all");
          }}>
            {Object.entries(scoutLeagueOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>
          보강 포지션
          <select disabled={pending} value={position} onChange={(event) => {
            setPosition(event.target.value as ScoutPosition);
            setRole("all");
          }}>
            {Object.entries(scoutPositions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label>
          세부 포지션
          <select disabled={pending || position === "goalkeeper"} value={role} onChange={(event) => setRole(event.target.value as ScoutRoleOption)}>
            <option value="all">{position === "goalkeeper" ? "세부 포지션 없음" : "전체"}</option>
            {scoutRolesByPosition[position].map((option) => (
              <option key={option} value={option}>{scoutRoleLabel(option)}</option>
            ))}
          </select>
        </label>
        <button disabled={pending} type="submit">{pending ? "후보 찾는 중…" : "영입 후보 찾기"}</button>
      </form>

      {pending && <p className={styles.scoutSource} role="status">영입 후보를 찾고 있어요.</p>}
      {error && <p className={styles.scoutNotice} role="alert">{error}</p>}
      {result && (
        <div className={styles.scoutResults} aria-live="polite">
          <p className={styles.scoutResultTitle}>
            {scoutLeagueOptions[result.league]} · {result.role === "all" ? scoutPositions[result.position] : scoutRoleLabel(result.role)}
            <span>후보 {result.totalMatching}명{result.totalMatching > result.players.length ? ` · ${result.players.length}명 표시` : ""}</span>
          </p>
          {result.unavailableLeagues.length > 0 && (
            <p className={styles.scoutNotice}>{result.unavailableLeagues.map((code) => scoutLeagues[code]).join(", ")} 명단은 지금 볼 수 없어요.</p>
          )}
          {result.scannedClubs < result.targetClubs && (
            <p className={styles.scoutNotice}>전체 {result.targetClubs}팀 중 명단을 확인한 {result.scannedClubs}팀에서 찾았어요.</p>
          )}
          {result.players.length ? (
            <ul className={styles.scoutList}>
              {result.players.map((player) => (
                <li key={player.id}>
                  <h3>{player.name}</h3>
                  <dl className={styles.scoutFields}>
                    <div>
                      <dt>소속 클럽</dt>
                      <dd>{player.club}{player.league && <small>{scoutLeagues[player.league]}</small>}</dd>
                    </div>
                    <div>
                      <dt>생년월일</dt>
                      <dd>{player.dateOfBirth ? <time dateTime={player.dateOfBirth}>{player.dateOfBirth}</time> : "미확인"}</dd>
                    </div>
                    <div>
                      <dt>포지션</dt>
                      <dd>
                        {player.role ? scoutRoleLabel(player.role) : scoutPositions[result.position]}
                        {player.positionSource === "reference" && <small>참고 자료</small>}
                      </dd>
                    </div>
                  </dl>
                  <button type="button" className={styles.scoutOpenPlayer}
                    aria-label={`${player.name} 프로필과 영입 토론 보기`}
                    onClick={() => setSelectedPlayer({ player, position: result.position })}>프로필 · 영입 토론</button>
                </li>
              ))}
            </ul>
          ) : result.role !== "all" && !result.availableRoles.includes(result.role) ? (
            <>
              <p className={styles.scoutNotice}>이 리그에서 {scoutRoleLabel(result.role)}로 확인된 선수가 없어요. 5대 리그 전체나 {scoutPositions[result.position]} 전체로 넓혀보세요.</p>
              {result.league === league && result.position === position && (
                <button type="button" className={styles.scoutOpenPlayer} onClick={searchBroadPosition}>{scoutPositions[result.position]} 전체 보기</button>
              )}
            </>
          ) : <p className={styles.scoutNotice}>이 조건에 맞는 후보가 없어요. 다른 리그나 포지션으로 찾아볼까요?</p>}
          {result.players.length > 0 && result.role === "all" && result.position !== "goalkeeper" && !result.availableRoles.length && (
            <p className={styles.scoutNotice}>{result.position === "defender" ? "센터백·풀백 구분 없이 수비수 전체에서 찾았어요." : `세부 포지션 구분 없이 ${scoutPositions[result.position]} 전체에서 찾았어요.`}</p>
          )}
        </div>
      )}
      <p className={styles.scoutSource}>조건에 맞는 후보를 이름순으로 최대 {scoutResultLimit}명 보여줘요. 소속은 football-data.org 명단을 기준으로, 일부 세부 포지션은 <a href="https://github.com/dcaribou/transfermarkt-datasets">2026년 7월 참고 자료</a>로 보완했어요.</p>
      {selectedPlayer && <ScoutPlayerDialog key={selectedPlayer.player.id} {...selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </section>
  );
}
