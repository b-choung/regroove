"use client";

import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { SkillMatchBadge } from "@/components/skills/skill-match-badge";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateJobPosting } from "@/hooks/use-job-postings";
import { isApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import {
  JOB_SOURCE_LABELS,
  JOB_STATUS_LABELS,
  KANBAN_COLUMNS,
  type JobPosting,
  type JobStatus,
} from "@/types/job-posting";

/** 카드에 나열할 기술스택 개수. 넘치면 +n으로 접는다. */
const VISIBLE_SKILLS = 3;

export function JobPostingCard({
  jobPosting,
  handle,
  className,
}: {
  jobPosting: JobPosting;
  /** 드래그 손잡이. 정렬 래퍼가 주입하고, DragOverlay 미리보기에서는 비어 있다. */
  handle?: React.ReactNode;
  className?: string;
}) {
  const selectJobPosting = useUiStore((state) => state.selectJobPosting);
  const { mutate, isPending } = useUpdateJobPosting();

  function handleStatusChange(status: JobStatus) {
    if (status === jobPosting.status) return;

    mutate(
      {
        id: jobPosting.id,
        // position은 서버가 새 컬럼 맨 아래로 계산한다. (2주차 드래그에서만 직접 지정)
        patch: { status, expectedUpdatedAt: jobPosting.updatedAt },
      },
      {
        onError: (error) => {
          if (isApiError(error) && error.code === "conflict") return;
          toast.error("상태를 변경하지 못했습니다.", {
            description: error.message,
          });
        },
      },
    );
  }

  const hiddenSkillCount = jobPosting.requiredSkills.length - VISIBLE_SKILLS;

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 space-y-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => selectJobPosting(jobPosting.id)}
        >
          <p className="text-xs text-muted-foreground">{jobPosting.company}</p>
          <p className="text-sm leading-snug font-medium">{jobPosting.title}</p>
        </button>
        {handle}
      </div>

      <SkillMatchBadge requiredSkills={jobPosting.requiredSkills} />

      {jobPosting.requiredSkills.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {jobPosting.requiredSkills.slice(0, VISIBLE_SKILLS).map((skill) => (
            <li key={skill}>
              <Badge variant="secondary">{skill}</Badge>
            </li>
          ))}
          {hiddenSkillCount > 0 && (
            <li>
              <Badge variant="outline">+{hiddenSkillCount}</Badge>
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{JOB_SOURCE_LABELS[jobPosting.source]}</span>
        {jobPosting.deadline && <span>마감 {jobPosting.deadline}</span>}
        {jobPosting.url && (
          <a
            href={jobPosting.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3" />
            원문
          </a>
        )}
      </div>

      {/* 2주차에 드래그앤드롭이 들어오기 전까지 카드를 옮기는 유일한 수단. */}
      <Select
        items={JOB_STATUS_LABELS}
        value={jobPosting.status}
        onValueChange={(value) => handleStatusChange(value as JobStatus)}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KANBAN_COLUMNS.map((column) => (
            <SelectItem key={column.status} value={column.status}>
              {column.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
  );
}
