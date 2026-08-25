"use client";

import {
  CheckCircle2Icon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PARSED_FIELD_LABELS, type ParsedJobPosting } from "@/types/parsing";

/**
 * 파싱 결과 안내.
 *
 * 어느 단계에서 채웠는지(메타데이터 / AI 추출)와 못 채운 항목을 그대로 보여준다.
 * 자동 입력은 조용히 틀리는 게 가장 위험해서, 사용자가 무엇을 확인해야 하는지
 * 감출 이유가 없다.
 */

const STRATEGY_LABELS: Record<ParsedJobPosting["strategy"], string> = {
  jsonld: "공고 페이지 메타데이터",
  og: "공고 페이지 메타데이터(OG)",
  llm: "AI가 본문에서 추출",
  manual: "자동 추출 실패",
};

export function ParseNotice({ parsed }: { parsed: ParsedJobPosting }) {
  const isFilled = parsed.strategy !== "manual";

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted p-3.5 text-caption">
      <p className="flex items-center gap-1.5 font-medium">
        {/* 초록·주황 대신 팔레트 안의 두 색으로. 성공은 포인트, 실패는 경고색이다. */}
        {isFilled ? (
          <CheckCircle2Icon className="size-3.5 text-primary" />
        ) : (
          <TriangleAlertIcon className="size-3.5 text-destructive" />
        )}
        {STRATEGY_LABELS[parsed.strategy]}
        {parsed.strategy === "llm" && (
          <Badge variant="secondary" className="gap-1">
            <SparklesIcon className="size-3" />
            AI
          </Badge>
        )}
      </p>

      {parsed.missing.length > 0 && (
        <p className="text-muted-foreground">
          직접 입력해주세요:{" "}
          {parsed.missing.map((field) => PARSED_FIELD_LABELS[field]).join(", ")}
        </p>
      )}

      {parsed.warnings.map((warning) => (
        <p key={warning} className="font-medium text-foreground">
          {warning}
        </p>
      ))}
    </div>
  );
}
