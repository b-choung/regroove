"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KANBAN_COLUMNS, type JobStatus } from "@/types/job-posting";

/** 컬럼별로 몇 건이 쌓여 있는지. 보드 컬럼 순서를 그대로 따른다. */
export function StatusBreakdown({
  byStatus,
  total,
}: {
  byStatus: Record<JobStatus, number>;
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>상태별 분포</CardTitle>
        <CardDescription>보드 컬럼에 쌓인 공고 수입니다.</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="space-y-2.5">
          {KANBAN_COLUMNS.map((column) => {
            const count = byStatus[column.status];

            return (
              <div key={column.status} className="flex items-center gap-3">
                <dt className="w-20 shrink-0 text-caption text-muted-foreground">
                  {column.label}
                </dt>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    // 막대 색은 퍼널과 같은 포인트 컬러. 투명도로 단계를 나누면
                    // 같은 색이 화면마다 다르게 보인다.
                    className="h-full rounded-full bg-primary"
                    // total이 0이면 어차피 모든 값이 0이라 폭 계산을 건너뛴다.
                    style={{
                      width: total === 0 ? 0 : `${(count / total) * 100}%`,
                    }}
                  />
                </div>
                <dd className="w-6 shrink-0 text-right text-body tabular-nums">
                  {count}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
