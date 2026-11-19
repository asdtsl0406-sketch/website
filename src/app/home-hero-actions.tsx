import Link from "next/link";
import styles from "./home-hero.module.css";

const actions = [
  { href: "/matches", label: "경기 일정 보기", primary: true },
  { href: "/community", label: "팬 커뮤니티 둘러보기" },
  { href: "/squad#scout-title", label: "영입 스카우트" },
];

export function HomeHeroActions() {
  return (
    <div className={styles.actions}>
      {actions.map(action => (
        <Link
          key={action.href}
          className={`${styles.action} ${action.primary ? styles.primary : ""}`}
          href={action.href}
        >
          {action.label}
          <span aria-hidden="true">↗</span>
        </Link>
      ))}
    </div>
  );
}
