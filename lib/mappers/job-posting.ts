import type {
  JobPostingRow,
  NoteRow,
  UserSkillProfileRow,
} from "@/types/database";
import type {
  JobPosting,
  JobPostingInput,
  Note,
  UserSkillProfile,
  UserSkillProfileInput,
} from "@/types/job-posting";

/** DB row(snake_case) → 도메인 객체(camelCase) */
export function toJobPosting(row: JobPostingRow): JobPosting {
  return {
    id: row.id,
    userId: row.user_id,
    url: row.url,
    company: row.company,
    title: row.title,
    deadline: row.deadline,
    requiredSkills: row.required_skills,
    status: row.status,
    source: row.source,
    rawContent: row.raw_content,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 도메인 입력 → DB insert payload */
export function toJobPostingInsert(
  input: JobPostingInput,
  userId: string,
  position: number,
): Omit<JobPostingRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    url: input.url,
    company: input.company,
    title: input.title,
    deadline: input.deadline,
    required_skills: input.requiredSkills,
    status: input.status,
    source: input.source,
    raw_content: input.rawContent,
    position,
  };
}

/**
 * 도메인 부분 업데이트 → DB update payload.
 * undefined인 필드는 payload에서 제외해 불필요한 컬럼 덮어쓰기를 막는다.
 */
export function toJobPostingUpdate(
  patch: Partial<JobPostingInput> & { position?: number },
): Partial<JobPostingRow> {
  const row: Partial<JobPostingRow> = {};
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.deadline !== undefined) row.deadline = patch.deadline;
  if (patch.requiredSkills !== undefined)
    row.required_skills = patch.requiredSkills;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.rawContent !== undefined) row.raw_content = patch.rawContent;
  if (patch.position !== undefined) row.position = patch.position;
  return row;
}

export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    jobPostingId: row.job_posting_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** 도메인 입력 → DB upsert payload (사용자당 1행) */
export function toUserSkillProfileUpsert(
  input: UserSkillProfileInput,
  userId: string,
): Omit<UserSkillProfileRow, "created_at" | "updated_at"> {
  return {
    user_id: userId,
    skills: input.skills,
    experience_years: input.experienceYears,
  };
}

export function toUserSkillProfile(row: UserSkillProfileRow): UserSkillProfile {
  return {
    userId: row.user_id,
    skills: row.skills,
    experienceYears: Number(row.experience_years),
  };
}
