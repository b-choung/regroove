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
        <dl className="space-y-1.5">
          {KANBAN_COLUMNS.map((column) => {
            const count = byStatus[column.status];

            return (
              <div key={column.status} className="flex items-center gap-3">
                <dt className="w-20 shrink-0 text-xs text-muted-foreground">
                  {column.label}
                </dt>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/40"
                    // total이 0이면 어차피 모든 값이 0이라 폭 계산을 건너뛴다.
                    style={{
                      width: total === 0 ? 0 : `${(count / total) * 100}%`,
                    }}
                  />
                </div>
                <dd className="w-6 shrink-0 text-right text-sm tabular-nums">
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
