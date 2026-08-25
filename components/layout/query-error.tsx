"use client";

import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";

/**
 * 조회 실패 안내.
 *
 * 서버가 준 메시지를 그대로 보여준다. "불러오지 못했습니다"를 앞에 덧붙이면
 * 설치 안내(스키마 미적용) 같은 구체적인 문구가 일반 문구에 묻힌다.
 */
export function QueryError({
  error,
  fallbackMessage,
  onRetry,
}: {
  error: unknown;
  fallbackMessage: string;
  onRetry: () => void;
}) {
  // 마이그레이션 미적용은 "다시 시도"로 해결되지 않는다.
  const isSetupProblem = isApiError(error) && error.code === "schema_missing";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <p className="text-body text-muted-foreground">
        {isApiError(error) ? error.message : fallbackMessage}
      </p>
      {!isSetupProblem && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
