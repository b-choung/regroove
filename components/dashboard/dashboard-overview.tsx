"use client";

import { useMemo } from "react";
import { PlusIcon } from "lucide-react";
import { DeadlineCard } from "@/components/dashboard/deadline-card";
import { FunnelCard } from "@/components/dashboard/funnel-card";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { StatusBreakdown } from "@/components/dashboard/status-breakdown";
import { QueryError } from "@/components/layout/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobPostings } from "@/hooks/use-job-postings";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { useUiStore } from "@/stores/ui-store";

/**
 * 대시보드.
 *
 * 통계 전용 API를 따로 두지 않고 보드와 같은 목록 캐시(`useJobPostings`)에서
 * 계산한다. 개인용 규모(수백 건)에서는 집계 쿼리를 얹을 이유가 없고, 보드에서
 * 카드를 옮긴 결과가 대시보드에 곧바로 반영되는 이점이 있다.
 */
export function DashboardOverview() {
  const { data, isPending, isError, error, refetch } = useJobPostings();
  const openCreateDialog = useUiStore((state) => state.openCreateDialog);

  const stats = useMemo(
    () => (data ? computeDashboardStats(data) : null),
    [data],
  );

  if (isPending) return <OverviewSkeleton />;

  if (isError) {
    return (
      <QueryError
        error={error}
        fallbackMessage="통계를 계산하지 못했습니다."
        onRetry={() => refetch()}
      />
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card p-10">
        <p className="text-body text-muted-foreground">
          공고를 등록하면 지원 통계를 보여줍니다.
        </p>
        <Button onClick={openCreateDialog}>
          <PlusIcon />첫 공고 추가하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid stats={stats} />

      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <FunnelCard funnel={stats.funnel} />
        <DeadlineCard
          overdue={stats.overdue}
          dueSoon={stats.dueSoon}
          today={stats.today}
        />
        <StatusBreakdown byStatus={stats.byStatus} total={stats.total} />
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-52 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
