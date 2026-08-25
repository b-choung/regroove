"use client";

import { ExternalLinkIcon, Trash2Icon } from "lucide-react";
import { SkillMatchBadge } from "@/components/skills/skill-match-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deadlineLabel,
  deadlineTone,
  todayInSeoul,
} from "@/lib/job-postings/deadline";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import {
  JOB_SOURCE_LABELS,
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
  const requestDelete = useUiStore((state) => state.requestDeleteJobPosting);

  const hiddenSkillCount = jobPosting.requiredSkills.length - VISIBLE_SKILLS;

  return (
    <article
      className={cn(
        // 평상시 카드에는 그림자가 없다. 떠 있는 건 드래그 중인 카드뿐이다.
        "flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 space-y-0.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={() => selectJobPosting(jobPosting.id)}
        >
          <p className="text-caption text-muted-foreground">
            {jobPosting.company}
          </p>
          <p className="text-body font-medium">{jobPosting.title}</p>
        </button>
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${jobPosting.title} 공고 삭제`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => requestDelete(jobPosting.id)}
          >
            <Trash2Icon />
          </Button>
          {handle}
        </div>
      </div>

      <SkillMatchBadge requiredSkills={jobPosting.requiredSkills} />

      {jobPosting.requiredSkills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
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

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-muted-foreground">
        <span>{JOB_SOURCE_LABELS[jobPosting.source]}</span>
        {jobPosting.deadline && (
          <DeadlineText
            deadline={jobPosting.deadline}
            status={jobPosting.status}
          />
        )}
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
    </article>
  );
}

/**
 * 마감일. 임박·초과일 때만 D-day를 덧붙여 강조한다.
 *
 * 날짜만 나열하면 급한 공고가 눈에 들어오지 않는다. 결과가 나온 공고는 마감일이
 * 지났어도 할 일이 아니므로 강조하지 않는다.
 */
function DeadlineText({
  deadline,
  status,
}: {
  deadline: string;
  status: JobStatus;
}) {
  const today = todayInSeoul();
  const tone = status === "result" ? "normal" : deadlineTone(deadline, today);

  return (
    <span
      className={cn(
        tone === "overdue" && "font-medium text-destructive",
        tone === "due-soon" && "font-medium text-foreground",
      )}
    >
      마감 {deadline}
      {tone !== "normal" && ` · ${deadlineLabel(deadline, today)}`}
    </span>
  );
}
