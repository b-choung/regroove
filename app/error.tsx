"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * 렌더 중 발생한 예외를 받는 경계.
 *
 * 없으면 프로덕션에서 스타일 없는 Next 기본 에러 화면이 뜬다. 사용자가 할 수 있는
 * 일(다시 시도)과 문의할 때 필요한 값(digest)만 남긴다 — 실제 메시지는 프로덕션
 * 빌드에서 digest로 가려지므로 화면에 적어도 도움이 되지 않는다.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] 렌더 중 오류", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <div className="space-y-1">
          <h1 className="text-body font-semibold">화면을 그리지 못했습니다.</h1>
          <p className="text-caption text-muted-foreground">
            일시적인 문제일 수 있습니다. 다시 시도해도 같으면 잠시 후 다시
            열어주세요.
            {error.digest && (
              <>
                <br />
                오류 ID: <span className="tabular-nums">{error.digest}</span>
              </>
            )}
          </p>
        </div>
        <Button onClick={reset}>다시 시도</Button>
      </div>
    </main>
  );
}
