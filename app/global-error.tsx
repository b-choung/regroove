"use client";

import { Button } from "@/components/ui/button";
import "./globals.css";

/**
 * 루트 레이아웃 자체가 실패했을 때의 마지막 경계.
 *
 * 이 화면은 루트 레이아웃을 대체하므로 html/body를 직접 그려야 하고, 스타일도
 * 여기서 다시 불러와야 한다. (환경변수 누락처럼 앱이 아예 못 뜨는 경우)
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground antialiased">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <div className="space-y-1">
            <h1 className="text-body font-semibold">
              앱을 시작하지 못했습니다.
            </h1>
            <p className="text-caption text-muted-foreground">
              설정 문제일 수 있습니다. 계속 같으면 서버 로그를 확인해주세요.
            </p>
          </div>
          <Button onClick={reset}>다시 시도</Button>
        </div>
      </body>
    </html>
  );
}
