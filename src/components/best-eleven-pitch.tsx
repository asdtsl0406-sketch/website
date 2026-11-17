import { formation, players } from "@/lib/data";

const formationLines = [
  ["LW", "ST", "RW"],
  ["CM", "CDM", "CM"],
  ["LB", "CB", "CB", "RB"],
  ["GK"],
];
const lineLabels = ["공격수", "미드필더", "수비수", "골키퍼"];
const englishPositionLabels: Record<string, { abbreviation: string; fullName: string }> = {
  LW: { abbreviation: "LW", fullName: "Left Winger" },
  ST: { abbreviation: "CF", fullName: "Centre Forward" },
  RW: { abbreviation: "RW", fullName: "Right Winger" },
  CM: { abbreviation: "CM", fullName: "Central Midfielder" },
  CDM: { abbreviation: "DM", fullName: "Defensive Midfielder" },
  LB: { abbreviation: "LB", fullName: "Left Back" },
  CB: { abbreviation: "CB", fullName: "Centre Back" },
  RB: { abbreviation: "RB", fullName: "Right Back" },
  GK: { abbreviation: "GK", fullName: "Goalkeeper" },
};

function playersInLine(positions: string[]) {
  const remaining = [...players];
  return positions.flatMap((position) => {
    const index = remaining.findIndex((player) => player.position === position);
    return index < 0 ? [] : [remaining.splice(index, 1)[0]];
  });
}

export function BestElevenPitch({ englishPositions = false }: { englishPositions?: boolean }) {
  const lines = formationLines.map(playersInLine);

  return (
    <section className="best-eleven" aria-labelledby="best-eleven-title">
      <header className="best-eleven-heading">
        <h2 id="best-eleven-title">베스트 11 <span>{formation}</span></h2>
        <p>팬페이지가 뽑은 {formation} 라인업</p>
      </header>
      <div className="pitch best-eleven-pitch" role="group" aria-label={`팬페이지 선정 ${formation} 라인업`}>
        <div className="pitch-line halfway" />
        <div className="pitch-circle" />
        <div className="pitch-box top-box" />
        <div className="pitch-box bottom-box" />
        <div className="pitch-goal top-goal" />
        <div className="pitch-goal bottom-goal" />
        <div className="best-eleven-rows">
          {lines.map((line, index) => (
            <div
              className="best-eleven-line"
              key={index}
              role="list"
              aria-label={`${lineLabels[index]} ${line.length}명`}
              style={{ gridTemplateColumns: `repeat(${line.length}, minmax(0, 1fr))` }}
            >
              {line.map((player) => (
                <div className="best-eleven-player" role="listitem" key={player.id}>
                  <span className="best-eleven-player-name">{player.nameKr}</span>
                  {englishPositions ? (
                    <small
                      title={englishPositionLabels[player.position]?.fullName ?? player.role}
                      aria-label={englishPositionLabels[player.position]?.fullName ?? player.role}
                    >{englishPositionLabels[player.position]?.abbreviation ?? player.position}</small>
                  ) : (
                    <small>{player.role}</small>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
