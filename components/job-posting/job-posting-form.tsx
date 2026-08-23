"use client";

import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  JOB_SOURCES,
  JOB_SOURCE_LABELS,
  JOB_STATUS_LABELS,
  KANBAN_COLUMNS,
  jobPostingInputSchema,
  type JobPosting,
  type JobPostingInput,
  type JobSource,
  type JobStatus,
} from "@/types/job-posting";

/**
 * 공고 입력 폼.
 *
 * 폼은 문자열만 다루고(빈 문자열 = 미입력), 도메인 값 변환과 검증은
 * jobPostingInputSchema 한 곳에서 처리한다. 서버 API도 같은 스키마로
 * 검증하므로 클라이언트/서버 규칙이 갈라지지 않는다.
 */

export interface JobPostingFormValues {
  url: string;
  company: string;
  title: string;
  deadline: string;
  /** 쉼표로 구분한 기술스택. 3주차 자동 추출 결과도 같은 칸에 채운다. */
  requiredSkills: string;
  status: JobStatus;
  source: JobSource;
  rawContent: string;
}

export function toFormValues(jobPosting?: JobPosting): JobPostingFormValues {
  return {
    url: jobPosting?.url ?? "",
    company: jobPosting?.company ?? "",
    title: jobPosting?.title ?? "",
    deadline: jobPosting?.deadline ?? "",
    requiredSkills: jobPosting?.requiredSkills.join(", ") ?? "",
    status: jobPosting?.status ?? "interested",
    source: jobPosting?.source ?? "manual",
    rawContent: jobPosting?.rawContent ?? "",
  };
}

function toInput(values: JobPostingFormValues) {
  return {
    url: values.url.trim() || null,
    company: values.company.trim(),
    title: values.title.trim(),
    deadline: values.deadline.trim() || null,
    requiredSkills: values.requiredSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    status: values.status,
    source: values.source,
    rawContent: values.rawContent.trim() || null,
  };
}

interface JobPostingFormProps {
  /** 다이얼로그 푸터의 제출 버튼이 form 밖에 있어서 id로 연결한다. */
  formId: string;
  initialValues: JobPostingFormValues;
  /** 서버가 돌려준 필드별 에러(invalid_request). */
  serverFieldErrors?: Record<string, string[]>;
  onSubmit: (input: JobPostingInput) => void;
}

export function JobPostingForm({
  formId,
  initialValues,
  serverFieldErrors,
  onSubmit,
}: JobPostingFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof JobPostingFormValues>(
    key: K,
    value: JobPostingFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = jobPostingInputSchema.safeParse(toInput(values));
    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors as typeof errors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  }

  const fieldError = (key: keyof JobPostingFormValues) =>
    errors[key]?.[0] ?? serverFieldErrors?.[key]?.[0];

  const fieldId = (key: keyof JobPostingFormValues) => `${formId}-${key}`;

  return (
    // noValidate: type="url"/type="date"의 브라우저 기본 검증이 제출을 먼저 막으면
    // 우리 zod 메시지가 뜰 기회가 없다. 입력 타입은 모바일 키보드용으로만 남기고
    // 검증 메시지는 스키마 한 곳에서 관리한다.
    <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field
        id={fieldId("company")}
        label="회사명"
        error={fieldError("company")}
      >
        <Input
          id={fieldId("company")}
          value={values.company}
          onChange={(event) => update("company", event.target.value)}
          placeholder="토스"
          autoFocus
        />
      </Field>

      <Field
        id={fieldId("title")}
        label="공고 제목"
        error={fieldError("title")}
      >
        <Input
          id={fieldId("title")}
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder="프론트엔드 개발자"
        />
      </Field>

      <Field
        id={fieldId("url")}
        label="공고 URL"
        error={fieldError("url")}
        optional
      >
        <Input
          id={fieldId("url")}
          type="url"
          value={values.url}
          onChange={(event) => update("url", event.target.value)}
          placeholder="https://www.wanted.co.kr/wd/12345"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id={fieldId("deadline")}
          label="마감일"
          error={fieldError("deadline")}
          optional
        >
          <Input
            id={fieldId("deadline")}
            type="date"
            value={values.deadline}
            onChange={(event) => update("deadline", event.target.value)}
          />
        </Field>

        <Field id={fieldId("source")} label="출처" error={fieldError("source")}>
          <Select
            items={JOB_SOURCE_LABELS}
            value={values.source}
            onValueChange={(value) => update("source", value as JobSource)}
          >
            <SelectTrigger id={fieldId("source")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {JOB_SOURCE_LABELS[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id={fieldId("status")}
        label="진행 상태"
        error={fieldError("status")}
      >
        <Select
          items={JOB_STATUS_LABELS}
          value={values.status}
          onValueChange={(value) => update("status", value as JobStatus)}
        >
          <SelectTrigger id={fieldId("status")} className="w-full">
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
      </Field>

      <Field
        id={fieldId("requiredSkills")}
        label="기술스택"
        error={fieldError("requiredSkills")}
        hint="쉼표로 구분 (예: TypeScript, React, Next.js)"
        optional
      >
        <Input
          id={fieldId("requiredSkills")}
          value={values.requiredSkills}
          onChange={(event) => update("requiredSkills", event.target.value)}
          placeholder="TypeScript, React"
        />
      </Field>

      <Field
        id={fieldId("rawContent")}
        label="공고 원문 / 메모"
        error={fieldError("rawContent")}
        hint="3주차 자동 파싱이 실패할 때 원문을 붙여 두면 스킬 추출에 쓴다."
        optional
      >
        <Textarea
          id={fieldId("rawContent")}
          value={values.rawContent}
          onChange={(event) => update("rawContent", event.target.value)}
          rows={4}
        />
      </Field>
    </form>
  );
}

interface FieldProps {
  /** label과 입력 요소를 잇는 id. 스크린리더와 테스트가 모두 이 연결에 의존한다. */
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, error, hint, optional, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="gap-1.5">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            (선택)
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
