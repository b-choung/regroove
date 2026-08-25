"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FunnelStats } from "@/lib/dashboard/stats";

/**
 * 지원 단계 전환.
 *
 * 단계는 누적이다("면접"까지 간 공고는 "지원 완료"도 통과했다). 그래서 막대
 * 길이는 지원 완료 이상 건수를 100%로 두고 잰다.
 */
export function FunnelCard({ funnel }: { funnel: FunnelStats }) {
  const stages = [
    { label: "지원 완료 이상", count: funnel.applied },
    { label: "서류 합격 이상", count: funnel.documentPassed },
    { label: "면접", count: funnel.interview },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>지원 단계 전환</CardTitle>
        <CardDescription>
          지금 어느 단계에 몇 건이 남아 있는지 봅니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {funnel.applied === 0 ? (
          <p className="text-body text-muted-foreground">
            아직 지원 완료로 옮긴 공고가 없습니다.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {stages.map((stage) => (
                <li key={stage.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-body">
                    <span>{stage.label}</span>
                    <span className="tabular-nums">{stage.count}건</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(stage.count / funnel.applied) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <dl className="grid grid-cols-2 gap-4 border-t pt-5">
              <Rate
                label="서류 통과율"
                rate={funnel.documentPassRate}
                detail={`${funnel.documentPassed}/${funnel.applied}`}
              />
              <Rate
                label="면접 전환율"
                rate={funnel.interviewRate}
                detail={`${funnel.interview}/${funnel.documentPassed}`}
              />
            </dl>
          </>
        )}

        {/* 숫자만 보여주면 "왜 result 공고가 빠졌는지" 알 수 없다. */}
        {funnel.excludedResults > 0 && (
          <p className="text-caption text-muted-foreground">
            결과 컬럼의 {funnel.excludedResults}건은 어느 단계에서 끝났는지 알
            수 없어 비율 계산에서 제외했습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Rate({
  label,
  rate,
  detail,
}: {
  label: string;
  rate: number | null;
  detail: string;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-display font-semibold tabular-nums">
        {/* 분모가 0이면 0%가 아니라 계산 불가다. 0%는 실패한 것처럼 읽힌다. */}
        {rate === null ? "—" : `${Math.round(rate * 100)}%`}
        <span className="ml-1.5 text-caption font-normal text-muted-foreground">
          {detail}
        </span>
      </dd>
    </div>
  );
}
