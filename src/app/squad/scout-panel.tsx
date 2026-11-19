"use client";

import { useState, type FormEvent } from "react";
import {
  scoutLeagueOptions, scoutLeagues, scoutPositions, scoutRoleLabel, scoutRolesByPosition,
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
  const knownRoles = result?.league === league && result.position === position && !result.unavailableLeagues.length
    && result.scannedClubs === result.targetClubs ? result.availableRoles : null;

  async function searchFor(selectedRole: ScoutRoleOption) {
    setPending(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/scout?" + new URLSearchParams({ league, position, role: selectedRole }), { cache: "no-store" });
      const data = await response.json() as ScoutResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "후보를 불러오지 못했어요.");
      setResult({ ...data, league, position, role: selectedRole });
      if (selectedRole !== "all" && !data.availableRoles.includes(selectedRole) && !data.unavailableLeagues.length
        && data.scannedClubs === data.targetClubs) setRole("all");
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
          <select disabled={pending || position === "goalkeeper" || knownRoles?.length === 0} value={role} onChange={(event) => setRole(event.target.value as ScoutRoleOption)}>
            <option value="all">{position === "goalkeeper" ? "세부 포지션 없음" : "전체"}</option>
            {scoutRolesByPosition[position].map((option) => (
              <option key={option} value={option} disabled={knownRoles !== null && !knownRoles.includes(option)}>{scoutRoleLabel(option)}</option>
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
            {scoutLeagueOptions[result.league]} · {result.role === "all" ? scoutPositions[result.position] : scoutRoleLabel(result.role)} <span>후보 {result.players.length}명</span>
          </p>
          {result.unavailableLeagues.length > 0 && (
            <p className={styles.scoutNotice}>{result.unavailableLeagues.map((code) => scoutLeagues[code]).join(", ")} 명단은 지금 볼 수 없어요.</p>
          )}
          {result.scannedClubs < result.targetClubs && (
            <p className={styles.scoutNotice}>전체 {result.targetClubs}팀 중 명단을 확인한 {result.scannedClubs}팀에서 찾았어요.</p>
          )}
          {result.players.length ? (
            <ul className={styles.scoutCards}>
              {result.players.map((player) => (
                <li key={player.id}>
                  <p className={styles.scoutClub}>{player.league ? scoutLeagues[player.league] + " · " : ""}{player.club}</p>
                  <h3>{player.name}</h3>
                  <p className={styles.scoutReason}>
                    {player.role ? scoutRoleLabel(player.role) : scoutPositions[result.position]}
                    {player.age !== null && ` · 만 ${player.age}세`}
                  </p>
                  <button type="button" className={styles.scoutOpenPlayer}
                    aria-label={`${player.name} 프로필과 영입 토론 보기`}
                    onClick={() => setSelectedPlayer({ player, position: result.position })}>프로필 · 영입 토론</button>
                </li>
              ))}
            </ul>
          ) : result.role !== "all" && !result.availableRoles.includes(result.role) ? (
            <>
              <p className={styles.scoutNotice}>{scoutRoleLabel(result.role)} 포지션이 확인된 선수가 없어요. {scoutPositions[result.position]} 전체에서 찾아볼까요?</p>
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
      <p className={styles.scoutSource}>포지션에 맞는 후보를 이름순으로 최대 3명 보여줘요. 실력순은 아니에요.</p>
      {selectedPlayer && <ScoutPlayerDialog key={selectedPlayer.player.id} {...selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </section>
  );
}
