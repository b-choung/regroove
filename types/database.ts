/**
 * Supabase 스키마 타입 (snake_case, DB 원본 형태).
 *
 * 지금은 `supabase/migrations/0001_init.sql`을 손으로 옮겨 적은 것이다.
 * 스키마가 바뀌면 아래 명령으로 재생성해 덮어쓰는 것을 권장한다.
 *   npx supabase gen types typescript --project-id <ref> --schema public > types/database.ts
 *
 * 애플리케이션 코드는 이 타입을 직접 쓰지 않고 `types/job-posting.ts`의
 * camelCase 도메인 타입을 사용한다. (변환은 `lib/mappers/`)
 */

export type JobStatusRow =
  | "interested"
  | "applying"
  | "applied"
  | "document_passed"
  | "interview"
  | "result";

export type JobSourceRow = "saramin" | "wanted" | "jobplanet" | "manual";

export interface JobPostingRow {
  id: string;
  user_id: string;
  url: string | null;
  company: string;
  title: string;
  deadline: string | null;
  required_skills: string[];
  status: JobStatusRow;
  source: JobSourceRow;
  raw_content: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  job_posting_id: string;
  content: string;
  created_at: string;
}

export interface UserSkillProfileRow {
  user_id: string;
  skills: string[];
  experience_years: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      job_postings: {
        Row: JobPostingRow;
        Insert: Omit<JobPostingRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<JobPostingRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<JobPostingRow>;
      };
      notes: {
        Row: NoteRow;
        Insert: Omit<NoteRow, "id" | "created_at"> &
          Partial<Pick<NoteRow, "id" | "created_at">>;
        Update: Partial<NoteRow>;
      };
      user_skill_profiles: {
        Row: UserSkillProfileRow;
        Insert: Omit<UserSkillProfileRow, "created_at" | "updated_at"> &
          Partial<Pick<UserSkillProfileRow, "created_at" | "updated_at">>;
        Update: Partial<UserSkillProfileRow>;
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      job_status: JobStatusRow;
      job_source: JobSourceRow;
    };
    CompositeTypes: Record<never, never>;
  };
}
