"use client";

import Image from "next/image";
import { useState } from "react";
import type { FootballTeam } from "@/lib/football-data";

export function TeamMark({ team }: { team: FootballTeam }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (team.id === 86) {
    return (
      <span className="crest-mark" aria-hidden="true">
        <Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized />
      </span>
    );
  }

  if (team.crest && !imageFailed) {
    return (
      <span className="team-crest" aria-hidden="true">
        <Image src={team.crest} alt="" fill sizes="32px" unoptimized onError={() => setImageFailed(true)} />
      </span>
    );
  }

  return <span className="opponent-badge" aria-hidden="true">{team.tla ?? team.shortName?.slice(0, 1) ?? team.name.slice(0, 1)}</span>;
}
