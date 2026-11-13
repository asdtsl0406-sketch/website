import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madridista | 레알마드리드 팬페이지",
  description: "팬이 함께 만드는 레알마드리드 경기와 선수 평점",
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
