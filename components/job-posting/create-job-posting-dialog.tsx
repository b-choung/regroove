"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  JobPostingForm,
  toFormValues,
  type JobPostingFormValues,
} from "@/components/job-posting/job-posting-form";
import { ParseNotice } from "@/components/job-posting/parse-notice";
import { UrlImport } from "@/components/job-posting/url-import";
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
import type { ParsedJobPosting } from "@/types/parsing";

const FORM_ID = "create-job-posting-form";

export function CreateJobPostingDialog() {
  const isOpen = useUiStore((state) => state.isCreateDialogOpen);
  const closeDialog = useUiStore((state) => state.closeCreateDialog);
  const { mutate, isPending, error, reset } = useCreateJobPosting();

  const [values, setValues] = useState<JobPostingFormValues>(toFormValues);
  const [parsed, setParsed] = useState<ParsedJobPosting | null>(null);

  function handleOpenChange(open: boolean) {
    if (open) return;
    closeDialog();
    reset();
    setValues(toFormValues());
    setParsed(null);
  }

  /** 자동으로 채운 값만 덮어쓰고, 사용자가 이미 입력한 값은 남긴다. */
  function handleImported(result: ParsedJobPosting) {
    setValues((previous) => ({
      ...previous,
      url: result.url,
      title: result.title ?? previous.title,
      company: result.company ?? previous.company,
      deadline: result.deadline ?? previous.deadline,
      requiredSkills:
        result.requiredSkills.length > 0
          ? result.requiredSkills.join(", ")
          : previous.requiredSkills,
      source: result.source,
      rawContent: result.rawContent ?? previous.rawContent,
    }));
    setParsed(result);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>공고 추가</DialogTitle>
          <DialogDescription>
            URL을 붙여넣어 자동으로 채우거나, 직접 입력해 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <UrlImport onImported={handleImported} />
        {parsed && <ParseNotice parsed={parsed} />}

        <JobPostingForm
          formId={FORM_ID}
          values={values}
          onChange={setValues}
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
