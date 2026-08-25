"use client";

import { AlertTriangleIcon, CalendarClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deadlineLabel } from "@/lib/job-postings/deadline";
import { useUiStore } from "@/stores/ui-store";
import { JOB_STATUS_LABELS, type JobPosting } from "@/types/job-posting";

/**
 * 마감 알림.
 *
 * 대시보드를 보는 이유가 "지금 뭘 해야 하나"라서, 항목을 누르면 보드로 돌아가지
 * 않고 그 자리에서 상세 모달이 열린다. (모달은 레이아웃에 마운트되어 있다)
 */
export function DeadlineCard({
  overdue,
  dueSoon,
  today,
}: {
  overdue: JobPosting[];
  dueSoon: JobPosting[];
  today: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>마감 알림</CardTitle>
        <CardDescription>
          결과가 나오지 않은 공고의 마감일만 봅니다.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {overdue.length > 0 && (
          <DeadlineGroup
            title="마감 지남"
            icon={<AlertTriangleIcon className="size-3.5 text-destructive" />}
            jobPostings={overdue}
            today={today}
            tone="overdue"
          />
        )}

        {dueSoon.length > 0 && (
          <DeadlineGroup
            title="마감 임박"
            icon={<CalendarClockIcon className="size-3.5" />}
            jobPostings={dueSoon}
            today={today}
            tone="due-soon"
          />
        )}

        {overdue.length === 0 && dueSoon.length === 0 && (
          <p className="text-sm text-muted-foreground">
            일주일 안에 마감하는 공고가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineGroup({
  title,
  icon,
  jobPostings,
  today,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  jobPostings: JobPosting[];
  today: string;
  tone: "overdue" | "due-soon";
}) {
  const selectJobPosting = useUiStore((state) => state.selectJobPosting);

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
        <span className="tabular-nums">({jobPostings.length})</span>
      </h3>

      <ul className="space-y-1">
        {jobPostings.map((jobPosting) => (
          <li key={jobPosting.id}>
            <button
              type="button"
              onClick={() => selectJobPosting(jobPosting.id)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {jobPosting.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {jobPosting.company} · {JOB_STATUS_LABELS[jobPosting.status]}
                </span>
              </span>
              <Badge
                variant={tone === "overdue" ? "destructive" : "secondary"}
                className="shrink-0 tabular-nums"
              >
                {/* 마감일 없는 공고는 애초에 이 목록에 들어오지 않는다. */}
                {deadlineLabel(jobPosting.deadline ?? "", today)}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
