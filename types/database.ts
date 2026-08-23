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

/**
 * Row 타입은 interface가 아니라 type alias로 선언한다.
 * TypeScript는 interface에 암시적 인덱스 시그니처를 부여하지 않아서,
 * supabase-js의 `Record<string, unknown>` 제약을 만족하지 못한다.
 * 그러면 Database 전체가 GenericSchema에서 탈락해 테이블 타입이 never로 붕괴한다.
 */
export type JobPostingRow = {
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
};

export type NoteRow = {
  id: string;
  job_posting_id: string;
  content: string;
  created_at: string;
};

export type UserSkillProfileRow = {
  user_id: string;
  skills: string[];
  experience_years: number;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      // `Relationships`는 PostgREST 조인 추론용이라 생략하면 안 된다.
      // 없으면 이 타입이 supabase-js의 GenericSchema 제약을 만족하지 못해
      // 테이블 타입 전체가 never로 붕괴하고, insert/update가 통째로 타입 에러가 난다.
      job_postings: {
        Row: JobPostingRow;
        Insert: Omit<JobPostingRow, "id" | "created_at" | "updated_at"> &
          Partial<Pick<JobPostingRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<JobPostingRow>;
        Relationships: [];
      };
      notes: {
        Row: NoteRow;
        Insert: Omit<NoteRow, "id" | "created_at"> &
          Partial<Pick<NoteRow, "id" | "created_at">>;
        Update: Partial<NoteRow>;
        Relationships: [
          {
            foreignKeyName: "notes_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
        ];
      };
      user_skill_profiles: {
        Row: UserSkillProfileRow;
        Insert: Omit<UserSkillProfileRow, "created_at" | "updated_at"> &
          Partial<Pick<UserSkillProfileRow, "created_at" | "updated_at">>;
        Update: Partial<UserSkillProfileRow>;
        Relationships: [];
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
