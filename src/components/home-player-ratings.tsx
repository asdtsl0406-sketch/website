"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { koreanDate, realMadridHomeAway, teamDisplayName, type AppearedPlayer, type FootballMatch } from "@/lib/football-data";
import styles from "./home-player-ratings.module.css";

const STORAGE_KEY = "madridista-match-ratings";
type StoredRatings = Record<string, Record<string, number>>;
type SquadPlayer = { id: string; name: string; shirtNumber?: number; position?: string | null };
type RosterPlayer = { id: string; name: string; shirtNumber?: number; position?: string | null };
type RosterState = "idle" | "loading" | "lineup" | "squad" | "error";

function readStoredRatings(): StoredRatings {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as StoredRatings : {};
  } catch {
    return {};
  }
}

async function fetchSquad() {
  const response = await fetch("/api/squad", { cache: "no-store" });
  const payload = await response.json() as { squad?: SquadPlayer[] };
  if (!response.ok || !Array.isArray(payload.squad) || payload.squad.length === 0) {
    throw new Error("선수단 정보를 불러오지 못했어요.");
  }
  return payload.squad;
}

export function HomePlayerRatings({
  matches,
  matchesLoading,
  matchesError,
  onRetry,
}: {
  matches: FootballMatch[];
  matchesLoading: boolean;
  matchesError: string | null;
  onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [rosterState, setRosterState] = useState<RosterState>("idle");
  const [rosterError, setRosterError] = useState("");
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [savedRatings, setSavedRatings] = useState<StoredRatings>({});
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const finishedMatches = useMemo(() => matches
    .filter((match) => match.status === "FINISHED")
    .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate)), [matches]);
  const selectedMatch = finishedMatches.find((match) => match.id === selectedMatchId) ?? null;
  const selectedPlayer = rosterPlayers.find((player) => player.id === selectedPlayerId) ?? null;
  const existingScore = selectedMatchId && selectedPlayerId
    ? savedRatings[selectedMatchId]?.[selectedPlayerId] ?? null
    : null;

  useEffect(() => {
    if (!finishedMatches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(finishedMatches[0]?.id ?? "");
    }
  }, [finishedMatches, selectedMatchId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setSavedRatings(readStoredRatings());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedMatchId) return;

    let active = true;
    setRosterState("loading");
    setRosterError("");
    setRosterPlayers([]);
    setSelectedPlayerId("");
    setSelectedScore(null);
    setMessage("");

    async function loadPlayers() {
      let appearedPlayers: AppearedPlayer[] = [];
      let matchStatus = "";
      try {
        const response = await fetch(`/api/matches/${encodeURIComponent(selectedMatchId)}`, { cache: "no-store" });
        if (response.ok) {
          const details = await response.json() as { status?: string; appearedPlayers?: AppearedPlayer[] };
          matchStatus = details.status ?? "";
          if (matchStatus === "FINISHED" && Array.isArray(details.appearedPlayers)) {
            appearedPlayers = details.appearedPlayers.filter((player) => player.teamId === 86);
          }
        }
      } catch {
        // If the appearance list is unavailable, offer the current squad instead.
      }

      if (!active) return;
      if (matchStatus && matchStatus !== "FINISHED") {
        setRosterError("종료된 경기만 평점을 남길 수 있어요.");
        setRosterState("error");
        return;
      }

      if (appearedPlayers.length > 0) {
        let squadById = new Map<string, SquadPlayer>();
        try {
          const squad = await fetchSquad();
          squadById = new Map(squad.map((player) => [player.id, player]));
        } catch {
          // Keep the provider names if the Korean squad-name mapping is unavailable.
        }
        if (!active) return;
        setRosterPlayers(appearedPlayers.map((player) => {
          const squadPlayer = squadById.get(player.playerId);
          return {
            id: player.playerId,
            name: squadPlayer?.name ?? player.playerName,
            shirtNumber: player.shirtNumber ?? squadPlayer?.shirtNumber,
            position: player.position ?? squadPlayer?.position,
          };
        }));
        setRosterState("lineup");
        return;
      }

      try {
        const squad = await fetchSquad();
        if (!active) return;
        setRosterPlayers(squad.map((player) => ({
          id: player.id,
          name: player.name,
          shirtNumber: player.shirtNumber,
          position: player.position,
        })));
        setRosterState("squad");
      } catch (error) {
        if (!active) return;
        setRosterError(error instanceof Error ? error.message : "선수 목록을 불러오지 못했어요.");
        setRosterState("error");
      }
    }

    void loadPlayers();
    return () => { active = false; };
  }, [attempt, isOpen, selectedMatchId]);

  function closeDialog() {
    setIsOpen(false);
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  function selectMatch(matchId: string) {
    setSelectedMatchId(matchId);
    setSelectedPlayerId("");
    setSelectedScore(null);
    setMessage("");
  }

  function selectPlayer(playerId: string) {
    setSelectedPlayerId(playerId);
    setSelectedScore(playerId ? savedRatings[selectedMatchId]?.[playerId] ?? null : null);
    setMessage("");
  }

  function saveRating() {
    if (!selectedMatch || !selectedPlayer || selectedScore === null) return;
    const currentRatings = readStoredRatings();
    const updated = {
      ...currentRatings,
      [selectedMatch.id]: {
        ...currentRatings[selectedMatch.id],
        [selectedPlayer.id]: selectedScore,
      },
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedRatings(updated);
      setMessage("평점을 저장했어요");
    } catch {
      setMessage("브라우저에 평점을 저장하지 못했어요. 저장 공간을 확인해 주세요.");
    }
  }

  function matchOption(match: FootballMatch) {
    const homeScore = match.score?.home;
    const awayScore = match.score?.away;
    const venue = realMadridHomeAway(match);
    return `${koreanDate(match.utcDate).dateLabel} · ${teamDisplayName(match.homeTeam)} ${homeScore ?? "—"}:${awayScore ?? "—"} ${teamDisplayName(match.awayTeam)}${venue ? ` · ${venue}` : ""}`;
  }

  return (
    <>
      <div className="page-width about-inner">
        <div className="about-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
        </div>
        <div>
          <div className="eyebrow light"><span /> YOUR MATCH NOTE</div>
          <h2>내 선수 평점</h2>
        </div>
        <p>경기를 고르고 선수에게 1~10점을 남겨보세요. 평점은 이 브라우저에만 저장돼요.</p>
        <button className={`about-button ${styles.openButton}`} type="button" ref={triggerRef} onClick={() => setIsOpen(true)}>
          선수 평점 남기기 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>

      <dialog
        className={styles.dialog}
        ref={dialogRef}
        aria-labelledby="home-rating-title"
        onClose={() => {
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <div className={styles.dialogContent}>
          <header className={styles.dialogHeader}>
            <div>
              <span className={styles.overline}>YOUR MATCH NOTE</span>
              <h2 id="home-rating-title">내 선수 평점</h2>
              <p>평점은 이 브라우저에만 저장돼요.</p>
            </div>
            <button className={styles.closeButton} type="button" aria-label="평점 창 닫기" onClick={closeDialog}>×</button>
          </header>

          {matchesLoading ? (
            <p className={styles.status} role="status">종료된 경기 목록을 불러오는 중입니다.</p>
          ) : matchesError ? (
            <div className={styles.error} role="alert">
              <p>{matchesError}</p>
              <button type="button" onClick={onRetry}>다시 시도</button>
            </div>
          ) : finishedMatches.length === 0 ? (
            <div className={styles.error}>
              <p>평점을 남길 수 있는 종료 경기가 없습니다.</p>
              <button type="button" onClick={onRetry}>다시 시도</button>
            </div>
          ) : (
            <>
              <div className={styles.step}>
                <label htmlFor="rating-match"><span>1</span> 경기 선택</label>
                <select id="rating-match" value={selectedMatchId} onChange={(event) => selectMatch(event.target.value)}>
                  {finishedMatches.map((match) => <option value={match.id} key={match.id}>{matchOption(match)}</option>)}
                </select>
              </div>

              <div className={styles.step}>
                <label htmlFor="rating-player"><span>2</span> {rosterState === "squad" ? "선수단에서 선택" : rosterState === "lineup" ? "출전 선수" : "선수 선택"}</label>
                {rosterState === "squad" && (
                  <p className={styles.rosterNote}>이 경기의 출전 명단을 확인할 수 없어요. 평가할 선수를 직접 선택해 주세요.</p>
                )}
                {rosterState === "loading" ? (
                  <p className={styles.status} role="status">선수 목록을 불러오는 중입니다.</p>
                ) : rosterState === "error" ? (
                  <div className={styles.error} role="alert">
                    <p>{rosterError}</p>
                    <button type="button" onClick={() => setAttempt((value) => value + 1)}>다시 시도</button>
                  </div>
                ) : (
                  <select
                    id="rating-player"
                    value={selectedPlayerId}
                    disabled={rosterState === "idle" || rosterPlayers.length === 0}
                    onChange={(event) => selectPlayer(event.target.value)}
                  >
                    <option value="">선수를 선택해 주세요</option>
                    {rosterPlayers.map((player) => (
                      <option value={player.id} key={player.id}>
                        {player.shirtNumber ? `${player.shirtNumber}. ` : ""}{player.name}{player.position ? ` · ${player.position}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedPlayer && (
                  <p className={styles.existingScore}>
                    {existingScore === null ? "저장된 평점이 없습니다." : `기존 평점 ${existingScore}점`}
                  </p>
                )}
              </div>

              <div className={styles.step}>
                <span className={styles.stepLabel}><span>3</span> 1~10점 선택</span>
                <div className={styles.scores} role="group" aria-label="1부터 10점까지 평점 선택">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                    <button
                      type="button"
                      key={score}
                      disabled={!selectedPlayerId}
                      className={selectedScore === score ? styles.chosenScore : ""}
                      aria-label={`${score}점`}
                      aria-pressed={selectedScore === score}
                      onClick={() => { setSelectedScore(score); setMessage(""); }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.saveArea}>
                <span className={styles.stepLabel}><span>4</span> 평점 저장</span>
                <button className={styles.saveButton} type="button" disabled={!selectedPlayerId || selectedScore === null || rosterState === "loading" || rosterState === "error"} onClick={saveRating}>
                  평점 저장
                </button>
                {message && <p className={styles.message} role="status">{message}</p>}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
