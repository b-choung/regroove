"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  JobPostingForm,
  toFormValues,
} from "@/components/job-posting/job-posting-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateJobPosting } from "@/hooks/use-job-postings";
import { isApiError } from "@/lib/api/errors";
import { useUiStore } from "@/stores/ui-store";
import type { JobPostingInput } from "@/types/job-posting";

const FORM_ID = "create-job-posting-form";

export function CreateJobPostingDialog() {
  const isOpen = useUiStore((state) => state.isCreateDialogOpen);
  const closeDialog = useUiStore((state) => state.closeCreateDialog);
  const { mutate, isPending, error, reset } = useCreateJobPosting();
  // 닫았다 열면 이전 입력이 남지 않도록 form을 새로 mount 시킨다.
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(open: boolean) {
    if (open) return;
    closeDialog();
    reset();
    setFormKey((key) => key + 1);
  }

  function handleSubmit(input: JobPostingInput) {
    mutate(input, {
      onSuccess: () => handleOpenChange(false),
      onError: (mutationError) => {
        // 필드 에러(invalid_request)는 폼 안에 인라인으로 보여주므로 토스트를 띄우지 않는다.
        if (isApiError(mutationError) && mutationError.fields) return;
        toast.error("공고를 추가하지 못했습니다.", {
          description: mutationError.message,
        });
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>공고 추가</DialogTitle>
          <DialogDescription>
            URL 자동 파싱은 3주차에 붙습니다. 지금은 직접 입력해 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <JobPostingForm
          key={formKey}
          formId={FORM_ID}
          initialValues={toFormValues()}
          serverFieldErrors={isApiError(error) ? error.fields : undefined}
          onSubmit={handleSubmit}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            취소
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
