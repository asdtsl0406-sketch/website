import { formation, players } from "@/lib/data";

const groups = [
  { label: "공격", positions: ["RW", "LW", "ST"] },
  { label: "중원", positions: ["CDM", "CM"] },
  { label: "수비", positions: ["RB", "CB", "LB"] },
  { label: "골키퍼", positions: ["GK"] },
];

export function SquadReference() {
  return (
    <div className="squad-reference">
      <div className="squad-reference-note">
        <span className="formation-chip">프로젝트 입력 포메이션 · {formation}</span>
        <p>기존 입력 선수의 이름과 포지션을 복구했습니다. 공식 선수단이나 실제 경기 선발 명단을 뜻하지 않습니다.</p>
      </div>
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
