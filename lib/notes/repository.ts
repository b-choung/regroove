import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NoteRow } from "@/types/database";
import type { NoteInput } from "@/types/job-posting";

/**
 * notes 데이터 접근 계층.
 *
 * notes에는 user_id가 없고, RLS가 부모 공고의 소유권으로 접근을 판단한다.
 * (`supabase/migrations/0001_init.sql`의 "notes owner full access")
 */

type Client = SupabaseClient<Database>;

export async function listNotes(
  client: Client,
  jobPostingId: string,
): Promise<NoteRow[]> {
  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("job_posting_id", jobPostingId)
    // 최근 메모가 위로. notes_job_posting_idx와 정렬 방향을 맞춘다.
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createNote(
  client: Client,
  jobPostingId: string,
  input: NoteInput,
): Promise<NoteRow> {
  const { data, error } = await client
    .from("notes")
    .insert({ job_posting_id: jobPostingId, content: input.content })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** 삭제된 행이 있으면 true, 대상이 없거나 남의 메모면 false. */
export async function deleteNote(client: Client, id: string): Promise<boolean> {
  const { data, error } = await client
    .from("notes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
