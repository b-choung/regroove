"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { JobPostingCard } from "@/components/job-posting/job-posting-card";
import { cn } from "@/lib/utils";
import type { JobPosting } from "@/types/job-posting";

/**
 * 카드에 드래그 기능만 얹는 래퍼.
 *
 * 카드 안에 상세 열기·삭제 버튼과 원문 링크가 있어서 카드 전체를 드래그 대상으로
 * 만들면 클릭이 드래그로 오인된다. 그래서 전용 손잡이만 드래그 리스너를 갖는다.
 */
export function SortableJobPostingCard({
  jobPosting,
}: {
  jobPosting: JobPosting;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: jobPosting.id,
    data: { type: "card", status: jobPosting.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // 원래 자리에는 흐릿한 자리표시자만 남기고, 손에 붙는 카드는 DragOverlay가 그린다.
      className={cn(isDragging && "opacity-40")}
    >
      <JobPostingCard
        jobPosting={jobPosting}
        handle={
          <button
            type="button"
            aria-label={`${jobPosting.title} 카드 옮기기`}
            className="-m-1 cursor-grab touch-none rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        }
      />
    </div>
  );
}
