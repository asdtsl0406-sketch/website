"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";
import styles from "./home-hero.module.css";

const actions = [
  { player: "vinicius", href: "/matches", label: "경기 일정 보기", primary: true },
  { player: "mbappe", href: "/community", label: "팬 커뮤니티 둘러보기" },
  { player: "bellingham", href: "/squad#scout-title", label: "영입 스카우트" },
] as const;

type Reaction = typeof actions[number]["player"];

export function HomeHeroActions() {
  const overlay = useRef<HTMLSpanElement>(null);
  const loaded = useRef(false);
  const [active, setActive] = useState<Reaction | null>(null);

  function track(event: PointerEvent<HTMLAnchorElement>, player: Reaction) {
    if (event.pointerType !== "mouse" || !loaded.current
      || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)").matches) return;

    const cursor = overlay.current;
    if (!cursor) return;
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    if (active !== player) setActive(player);
  }

  function clear() {
    setActive(null);
  }

  return (
    <div className={styles.actions}>
      {actions.map(action => (
        <Link
          key={action.player}
          className={`${styles.action} ${"primary" in action ? styles.primary : ""}`}
          href={action.href}
          data-photo-cursor={active === action.player ? "active" : undefined}
          onPointerEnter={event => track(event, action.player)}
          onPointerMove={event => track(event, action.player)}
          onPointerLeave={clear}
          onPointerCancel={clear}
          onClick={clear}
        >
          {action.label}
          <span aria-hidden="true">↗</span>
        </Link>
      ))}
      <span ref={overlay} className={styles.photoCursor} aria-hidden="true" data-active={active ?? undefined}>
        <span className={styles.reaction}>
          <span className={styles.reactionStrip}>
            <Image
              src="/images/home/real-reaction-triptych.webp"
              alt=""
              fill
              sizes="168px"
              loading="eager"
              onLoad={() => { loaded.current = true; }}
            />
          </span>
        </span>
      </span>
    </div>
  );
}
