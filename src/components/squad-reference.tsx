import { players } from "@/lib/data";

const groups = [
  { label: "공격수", positions: ["RW", "LW", "ST"] },
  { label: "미드필더", positions: ["CDM", "CM"] },
  { label: "수비수", positions: ["RB", "CB", "LB"] },
  { label: "골키퍼", positions: ["GK"] },
];

export function SquadReference() {
  return (
    <div className="squad-reference">
      <p className="squad-reference-intro">레알 마드리드 선수들을 포지션별로 살펴보세요.</p>
      <div className="squad-reference-groups">
        {groups.map((group) => {
          const members = players.filter((player) => group.positions.includes(player.position));
          return (
            <section className="squad-reference-group" key={group.label}>
              <h3>{group.label}</h3>
              <ul>
                {members.map((player) => <li key={player.id}>{player.nameKr}</li>)}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
