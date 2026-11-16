"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

const links = [
  { href: "/", label: "홈", id: "home" },
  { href: "/matches", label: "매치센터", id: "matches" },
  { href: "/community", label: "팬라운지", id: "community" },
];

function Crest() {
  return <span className="crest-mark" aria-hidden="true"><Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized /></span>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, nickname, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = pathname === "/" ? "home" : pathname.startsWith("/matches") ? "matches" : "community";

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner page-width">
          <Link className="brand" href="/" aria-label="Madridista 홈" onClick={() => setMenuOpen(false)}>
            <Crest />
            <span className="brand-copy"><strong>MADRIDISTA</strong><small>FAN CLUB · KOREA</small></span>
          </Link>
          <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} id="main-navigation" aria-label="메인 메뉴">
            {links.map((link) => (
              <Link key={link.id} className={active === link.id ? "active" : ""} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link className="mobile-auth-link" href="/auth" onClick={() => setMenuOpen(false)}>
              {loading ? "확인 중" : user ? `${nickname ?? "팬"} 계정` : "로그인 / 가입"}
            </Link>
          </nav>
          <div className="header-account">
            {user ? <button type="button" onClick={() => void signOut()}>{nickname ?? "팬"} · 로그아웃</button> : <Link href="/auth">로그인</Link>}
          </div>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </header>
      {menuOpen && <button className="menu-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
    </>
  );
}
