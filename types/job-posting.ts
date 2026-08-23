import { z } from "zod";

export const JOB_STATUSES = [
  "interested",
  "applying",
  "applied",
  "document_passed",
  "interview",
  "result",
] as const;

export const JOB_SOURCES = ["saramin", "wanted", "jobplanet", "manual"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobSource = (typeof JOB_SOURCES)[number];

/** 칸반보드 컬럼 정의. 배열 순서가 화면상 컬럼 순서다. */
export const KANBAN_COLUMNS: ReadonlyArray<{
  status: JobStatus;
  label: string;
}> = [
  { status: "interested", label: "관심" },
  { status: "applying", label: "지원 준비" },
  { status: "applied", label: "지원 완료" },
  { status: "document_passed", label: "서류 합격" },
  { status: "interview", label: "면접" },
  { status: "result", label: "결과" },
];

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  saramin: "사람인",
  wanted: "원티드",
  jobplanet: "잡플래닛",
  manual: "직접 입력",
};

export interface JobPosting {
  id: string;
  userId: string;
  url: string | null;
  company: string;
  title: string;
  /** ISO date (YYYY-MM-DD). 마감일 미정이면 null. */
  deadline: string | null;
  requiredSkills: string[];
  status: JobStatus;
  source: JobSource;
  rawContent: string | null;
  /** 칸반 컬럼 내 정렬 위치 (작을수록 위) */
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  jobPostingId: string;
  content: string;
  createdAt: string;
}

export interface UserSkillProfile {
  userId: string;
  skills: string[];
  experienceYears: number;
}

// ---------------------------------------------------------------------------
// 입력 스키마 (API Route / 폼에서 공용으로 사용)
// ---------------------------------------------------------------------------

export const jobPostingInputSchema = z.object({
  url: z.string().url("올바른 URL이 아닙니다.").nullable().default(null),
  company: z.string().min(1, "회사명을 입력해주세요."),
  title: z.string().min(1, "공고 제목을 입력해주세요."),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.")
    .nullable()
    .default(null),
  requiredSkills: z.array(z.string().min(1)).default([]),
  status: z.enum(JOB_STATUSES).default("interested"),
  source: z.enum(JOB_SOURCES).default("manual"),
  rawContent: z.string().nullable().default(null),
});

export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;

export const jobPostingUpdateSchema = jobPostingInputSchema.partial().extend({
  position: z.number().optional(),
  /**
   * 낙관적 잠금용. 클라이언트가 마지막으로 본 updatedAt을 함께 보내면
   * 서버가 더 최신 버전이 있는지 비교해 동시 편집 충돌을 감지한다.
   */
  expectedUpdatedAt: z.string().datetime().optional(),
});

export type JobPostingUpdate = z.infer<typeof jobPostingUpdateSchema>;

export const noteInputSchema = z.object({
  content: z.string().min(1, "메모 내용을 입력해주세요."),
});

export type NoteInput = z.infer<typeof noteInputSchema>;
