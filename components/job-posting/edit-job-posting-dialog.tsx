"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  JobPostingForm,
  toFormValues,
} from "@/components/job-posting/job-posting-form";
import { JobPostingNotes } from "@/components/job-posting/job-posting-notes";
import { SkillMatchSummary } from "@/components/skills/skill-match-summary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useJobPostings, useUpdateJobPosting } from "@/hooks/use-job-postings";
import { isApiError } from "@/lib/api/errors";
import { useUiStore } from "@/stores/ui-store";
import type { JobPosting, JobPostingInput } from "@/types/job-posting";

const FORM_ID = "edit-job-posting-form";

export function EditJobPostingDialog() {
  const selectedId = useUiStore((state) => state.selectedJobPostingId);
  const selectJobPosting = useUiStore((state) => state.selectJobPosting);
  const { data } = useJobPostings();
  // 목록 캐시에서 찾는다. 삭제 직후처럼 사라진 경우엔 null이 되어 닫힌다.
  const jobPosting =
    data?.find((candidate) => candidate.id === selectedId) ?? null;
  const update = useUpdateJobPosting();
  const requestDelete = useUiStore((state) => state.requestDeleteJobPosting);

  function close() {
    selectJobPosting(null);
    update.reset();
  }

  function handleSubmit(input: JobPostingInput) {
    if (!jobPosting) return;

    update.mutate(
      {
        id: jobPosting.id,
        // 낙관적 잠금: 이 화면이 보고 있던 시점 이후에 바뀌었으면 409로 돌아온다.
        patch: { ...input, expectedUpdatedAt: jobPosting.updatedAt },
      },
      {
        onSuccess: close,
        onError: (error) => {
          if (isApiError(error) && error.fields) return;
          // 충돌 안내는 훅에서 최신 상태로 갱신하며 함께 띄운다.
          if (isApiError(error) && error.code === "conflict") {
            close();
            return;
          }
          toast.error("공고를 수정하지 못했습니다.", {
            description: error.message,
          });
        },
      },
    );
  }

  /** 삭제는 카드와 같은 확인 모달이 맡는다. 이 모달은 스토어가 함께 닫는다. */
  function handleDeleteRequest() {
    if (!jobPosting) return;

    update.reset();
    requestDelete(jobPosting.id);
  }

  const isBusy = update.isPending;

  return (
    <Dialog
      open={jobPosting !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {/* 폼과 메모가 함께 들어가 길어지므로 내용만 스크롤시킨다. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>공고 상세</DialogTitle>
          <DialogDescription>
            {jobPosting?.company} · {jobPosting?.title}
          </DialogDescription>
        </DialogHeader>

        {jobPosting && (
          <EditFields
            // 다른 카드를 열면 폼 값을 그 공고 것으로 갈아끼운다.
            key={`${jobPosting.id}:${jobPosting.updatedAt}`}
            jobPosting={jobPosting}
            serverFieldErrors={
              isApiError(update.error) ? update.error.fields : undefined
            }
            onSubmit={handleSubmit}
          />
        )}

        {jobPosting && (
          <SkillMatchSummary requiredSkills={jobPosting.requiredSkills} />
        )}

        {jobPosting && <JobPostingNotes jobPostingId={jobPosting.id} />}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDeleteRequest}
            disabled={isBusy}
          >
            삭제
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={close}>
              취소
            </Button>
            <Button type="submit" form={FORM_ID} disabled={isBusy}>
              {update.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 입력값을 들고 있는 얇은 래퍼.
 *
 * JobPostingForm이 controlled라 값의 주인이 필요한데, 수정 화면에서는 "열려 있는
 * 공고가 바뀌면 초기화"가 맞는 동작이라 key로 다시 mount 시키는 쪽이 간단하다.
 */
function EditFields({
  jobPosting,
  serverFieldErrors,
  onSubmit,
}: {
  jobPosting: JobPosting;
  serverFieldErrors?: Record<string, string[]>;
  onSubmit: (input: JobPostingInput) => void;
}) {
  const [values, setValues] = useState(() => toFormValues(jobPosting));

  return (
    <JobPostingForm
      formId={FORM_ID}
      values={values}
      onChange={setValues}
      serverFieldErrors={serverFieldErrors}
      onSubmit={onSubmit}
    />
  );
}
