import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Pretendard 하나로 한글·라틴·숫자를 모두 그린다.
 *
 * Geist는 라틴 전용이라 한글이 OS 기본 폰트로 떨어져, 같은 줄에서 "토스"와 "D-7"이
 * 서로 다른 폰트로 보였다. 가변 폰트 파일 하나(2MB)를 직접 호스팅한다 — preload는
 * 하지 않고 swap으로 둬서 첫 방문의 텍스트 표시를 폰트가 붙잡지 않게 한다.
 */
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // 페이지가 title만 주면 "대시보드 · Regroove"로 합쳐진다.
  title: { default: "Regroove", template: "%s · Regroove" },
  description: "여러 채용 사이트의 공고를 한곳에 모아 칸반보드로 관리합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
