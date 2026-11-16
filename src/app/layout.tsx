import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madridista | 레알마드리드 팬페이지",
  description: "레알마드리드 경기 일정과 베스트 11, 브라우저 전용 내 평점",
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
