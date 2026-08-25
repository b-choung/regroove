"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNote, useDeleteNote, useNotes } from "@/hooks/use-notes";
import { noteInputSchema } from "@/types/job-posting";

/**
 * 공고별 메모 목록과 입력.
 *
 * 면접 일정, 담당자 연락처처럼 공고마다 형태가 다른 정보를 자유 텍스트로 쌓는다.
 * 스키마를 늘리는 대신 메모로 두는 편이 실제 구직 기록에 맞았다.
 */
export function JobPostingNotes({ jobPostingId }: { jobPostingId: string }) {
  const { data, isPending, isError } = useNotes(jobPostingId);
  const create = useCreateNote(jobPostingId);
  const remove = useDeleteNote(jobPostingId);
  const [content, setContent] = useState("");

  const canSubmit = noteInputSchema.safeParse({
    content: content.trim(),
  }).success;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    create.mutate(content.trim(), { onSuccess: () => setContent("") });
  }

  return (
    <section className="space-y-3 border-t pt-5">
      <h3 className="text-body font-semibold">메모</h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="면접 일정, 담당자 연락처, 준비할 것 등"
          rows={2}
          aria-label="새 메모"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!canSubmit || create.isPending}
          >
            {create.isPending ? "저장 중..." : "메모 추가"}
          </Button>
        </div>
      </form>

      {isPending && <Skeleton className="h-12 w-full" />}

      {isError && (
        <p className="text-caption text-destructive">
          메모를 불러오지 못했습니다.
        </p>
      )}

      {data?.length === 0 && (
        <p className="text-caption text-muted-foreground">
          아직 메모가 없습니다.
        </p>
      )}

      <ul className="space-y-2">
        {data?.map((note) => (
          <li
            key={note.id}
            className="flex items-start justify-between gap-2 rounded-lg bg-muted p-3"
          >
            <div className="space-y-1">
              <p className="text-body whitespace-pre-wrap">{note.content}</p>
              <p className="text-caption text-muted-foreground">
                {formatCreatedAt(note.createdAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="메모 삭제"
              disabled={remove.isPending}
              onClick={() => remove.mutate(note.id)}
            >
              <Trash2Icon className="text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
