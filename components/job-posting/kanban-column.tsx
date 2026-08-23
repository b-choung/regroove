"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableJobPostingCard } from "@/components/job-posting/sortable-job-posting-card";
import { cn } from "@/lib/utils";
import type { JobPosting, JobStatus } from "@/types/job-posting";

/**
 * 칸반 컬럼. 카드 위가 아닌 빈 영역에 놓아도 받을 수 있도록
 * 컬럼 자체를 드롭 대상으로 등록한다. (빈 컬럼으로 옮기는 유일한 방법)
 */
export function KanbanColumn({
  status,
  label,
  jobPostings,
}: {
  status: JobStatus;
  label: string;
  jobPostings: JobPosting[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <section
      ref={setNodeRef}
      // 이름 없는 section은 landmark로 노출되지 않는다. 컬럼 제목과 묶어
      // 스크린리더에서 "관심 컬럼"처럼 건너다닐 수 있게 한다.
      aria-labelledby={`column-${status}`}
      className={cn(
        "flex min-h-32 flex-col gap-2 rounded-lg border bg-muted/30 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between">
        <h2 id={`column-${status}`} className="text-sm font-medium">
          {label}
        </h2>
        <span className="text-xs text-muted-foreground">
          {jobPostings.length}
        </span>
      </header>

      <SortableContext
        items={jobPostings.map((jobPosting) => jobPosting.id)}
        strategy={verticalListSortingStrategy}
      >
        {jobPostings.map((jobPosting) => (
          <SortableJobPostingCard key={jobPosting.id} jobPosting={jobPosting} />
        ))}
      </SortableContext>

      {jobPostings.length === 0 && (
        <p className="flex flex-1 items-center justify-center rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          여기로 카드를 옮겨 보세요
        </p>
      )}
    </section>
  );
}
