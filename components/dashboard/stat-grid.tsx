"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RECENT_DAYS, type DashboardStats } from "@/lib/dashboard/stats";
import { DUE_SOON_DAYS } from "@/lib/job-postings/deadline";

/** 대시보드 상단 숫자 요약. */
export function StatGrid({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "전체 공고", value: stats.total, hint: "등록한 전체" },
    { label: "진행 중", value: stats.active, hint: "결과 확정 전" },
    {
      label: `최근 ${RECENT_DAYS}일 추가`,
      value: stats.addedRecently,
      hint: "새로 담은 공고",
    },
    {
      label: "마감 임박",
      value: stats.dueSoon.length,
      hint: `D-${DUE_SOON_DAYS} 이내`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} size="sm">
          <CardContent className="space-y-1">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {item.value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                건
              </span>
            </dd>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}
