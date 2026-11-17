import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madridista | 레알마드리드 팬페이지",
  description: "레알마드리드 경기 일정과 결과, 팬 커뮤니티 미리보기",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
