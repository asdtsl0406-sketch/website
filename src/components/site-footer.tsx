import Image from "next/image";
import Link from "next/link";

function Crest() {
  return <span className="crest-mark" aria-hidden="true"><Image src="/images/real-madrid-crest.svg" alt="" fill sizes="42px" unoptimized /></span>;
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-width footer-main">
        <Link className="brand footer-brand" href="/">
          <Crest />
          <span className="brand-copy"><strong>MADRIDISTA</strong><small>FAN CLUB · KOREA</small></span>
        </Link>
        <nav className="footer-nav" aria-label="푸터 메뉴">
          <Link href="/">홈</Link><Link href="/matches">매치센터</Link><Link href="/community">팬 커뮤니티</Link>
        </nav>
        <p>레알마드리드 CF와 제휴되지 않은 비공식 팬 프로젝트입니다.</p>
      </div>
      <div className="page-width footer-bottom">
        <span>경기 데이터: football-data.org</span>
        <span>사진: Zoser / Wikimedia Commons · 크롭 편집 · CC BY 4.0</span>
        <span>엠블럼 © Real Madrid CF</span>
      </div>
    </footer>
  );
}
