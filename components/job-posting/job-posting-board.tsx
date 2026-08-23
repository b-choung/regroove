"use client";

import { PlusIcon } from "lucide-react";
import { CreateJobPostingDialog } from "@/components/job-posting/create-job-posting-dialog";
import { EditJobPostingDialog } from "@/components/job-posting/edit-job-posting-dialog";
import { JobPostingCard } from "@/components/job-posting/job-posting-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobPostings } from "@/hooks/use-job-postings";
import { groupByStatus } from "@/lib/job-postings/group";
import { useUiStore } from "@/stores/ui-store";
import { KANBAN_COLUMNS, type JobPosting } from "@/types/job-posting";

/**
 * 상태별 컬럼 보드.
 *
 * 2주차에 이 컴포넌트 바깥을 dnd-kit DndContext로 감싸고, 컬럼을 드롭 대상으로
 * 만들 예정이다. 그래서 지금도 데이터 구조(컬럼 = 상태, 카드 순서 = position)를
 * 드래그 도입 후와 동일하게 맞춰 둔다.
 */
export function JobPostingBoard() {
  const { data, isPending, isError, error, refetch } = useJobPostings();
  const openCreateDialog = useUiStore((state) => state.openCreateDialog);
  const selectedId = useUiStore((state) => state.selectedJobPostingId);

  if (isPending) return <BoardSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8">
        <p className="text-sm text-muted-foreground">
          공고를 불러오지 못했습니다. {error.message}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const grouped = groupByStatus(data);
  const selected: JobPosting | null =
    data.find((jobPosting) => jobPosting.id === selectedId) ?? null;

  return (
    <>
      {data.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8">
          <p className="text-sm text-muted-foreground">
            아직 등록한 공고가 없습니다.
          </p>
          <Button size="sm" onClick={openCreateDialog}>
            <PlusIcon />첫 공고 추가하기
          </Button>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KANBAN_COLUMNS.map((column) => (
          <section
            key={column.status}
            // 이름 없는 section은 landmark로 노출되지 않는다. 컬럼 제목과 묶어
            // 스크린리더에서 "관심 컬럼"처럼 건너다닐 수 있게 한다.
            aria-labelledby={`column-${column.status}`}
            className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
          >
            <header className="flex items-center justify-between">
              <h2
                id={`column-${column.status}`}
                className="text-sm font-medium"
              >
                {column.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                {grouped[column.status].length}
              </span>
            </header>

            {grouped[column.status].map((jobPosting) => (
              <JobPostingCard key={jobPosting.id} jobPosting={jobPosting} />
            ))}
          </section>
        ))}
      </div>

      <CreateJobPostingDialog />
      <EditJobPostingDialog jobPosting={selected} />
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUMNS.map((column) => (
        <div
          key={column.status}
          className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
        >
          <h2 className="text-sm font-medium">{column.label}</h2>
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
