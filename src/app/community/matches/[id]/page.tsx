import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { competitionLabel, koreanDate, koreanKickoff, teamDisplayName } from "@/lib/football-data";
import { getMatchDetails } from "@/lib/match-details.server";
import { isMadridMatch, isMatchLoungeId, mvpCandidates } from "@/lib/match-lounge";
import { MatchLounge } from "./match-lounge";
import styles from "../../community.module.css";

export default async function MatchLoungePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isMatchLoungeId(id)) notFound();
  const details = await getMatchDetails(id);
  if (details.ok && !isMadridMatch(details.match)) notFound();
  const match = details.ok ? details.match : null;
  const finished = match?.status === "FINISHED";
  const label = match ? `${teamDisplayName(match.homeTeam)} ${finished ? `${match.score?.home ?? "–"} : ${match.score?.away ?? "–"}` : "vs"} ${teamDisplayName(match.awayTeam)}` : "경기 토론";

  return (
    <>
      <SiteHeader />
      <main className={`inner-page ${styles.page}`}>
        <div className={`page-width ${styles.loungeWidth}`}>
          <Link className="back-link" href="/community">← 팬 커뮤니티</Link>
          <header className={`${styles.heading} ${styles.loungeHeading}`}>
            <p>{finished ? "경기 후 토론" : "매치 라운지"}</p>
            <h1>{label}</h1>
            {match && (
              <p>{competitionLabel(match.competitionCode, match.competitionName)} · {koreanDate(match.utcDate).dateLabel} · {finished ? "경기 종료" : koreanKickoff(match)}</p>
            )}
          </header>
          {match ? <MatchLounge key={id} id={id} finished={finished} candidates={mvpCandidates(match)} />
            : <p className={styles.notice} role="status">경기 정보를 확인하지 못했어요. 잠시 후 다시 열어 주세요.</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
