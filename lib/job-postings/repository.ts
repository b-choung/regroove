import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JobPostingRow, JobStatusRow } from "@/types/database";
import type { JobPostingInput, JobPostingUpdate } from "@/types/job-posting";
import {
  toJobPostingInsert,
  toJobPostingUpdate,
} from "@/lib/mappers/job-posting";

/**
 * job_postings 데이터 접근 계층.
 *
 * 소유권 검사는 RLS(`auth.uid() = user_id`)가 담당하므로 여기서 user_id를
 * 다시 검사하지 않는다. 남의 공고 id로 접근하면 0행이 돌아와 404가 된다.
 */

type Client = SupabaseClient<Database>;

/**
 * 새 카드가 컬럼 맨 아래에 붙을 때 쓰는 간격.
 * 2주차 드래그 재정렬에서 이웃 두 카드의 중간값을 넣을 여유를 두려고 넓게 잡았다.
 */
const POSITION_STEP = 1024;

/** Postgres unique_violation. (user_id, url) 유니크 인덱스에 걸릴 때 쓴다. */
const UNIQUE_VIOLATION = "23505";

/** 같은 URL의 공고가 이미 저장돼 있을 때. */
export class DuplicateUrlError extends Error {
  constructor() {
    super("이미 저장한 공고 URL입니다.");
    this.name = "DuplicateUrlError";
  }
}

export type UpdateResult =
  | { kind: "updated"; row: JobPostingRow }
  /** 다른 클라이언트가 먼저 수정함. row는 서버의 최신 상태다. */
  | { kind: "conflict"; row: JobPostingRow }
  | { kind: "not_found" };

export async function listJobPostings(
  client: Client,
  userId: string,
): Promise<JobPostingRow[]> {
  const { data, error } = await client
    .from("job_postings")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function findJobPosting(
  client: Client,
  id: string,
): Promise<JobPostingRow | null> {
  const { data, error } = await client
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createJobPosting(
  client: Client,
  userId: string,
  input: JobPostingInput,
): Promise<JobPostingRow> {
  const position = await nextPosition(client, userId, input.status);
  const { data, error } = await client
    .from("job_postings")
    .insert(toJobPostingInsert(input, userId, position))
    .select("*")
    .single();

  if (error) throw asDomainError(error);
  return data;
}

export async function updateJobPosting(
  client: Client,
  userId: string,
  id: string,
  patch: JobPostingUpdate,
): Promise<UpdateResult> {
  const { expectedUpdatedAt, ...fields } = patch;
  const payload = toJobPostingUpdate(fields);

  // 보낼 컬럼이 없으면 update가 에러이므로 현재 상태를 그대로 돌려준다.
  if (Object.keys(payload).length === 0) {
    const current = await findJobPosting(client, id);
    return current ? { kind: "updated", row: current } : { kind: "not_found" };
  }

  // 컬럼을 옮기면서 위치를 지정하지 않았다면 새 컬럼 맨 아래로 보낸다.
  // (지정하지 않으면 이전 컬럼의 position이 그대로 남아 순서가 뒤섞인다.)
  if (patch.status !== undefined && patch.position === undefined) {
    const current = await findJobPosting(client, id);
    if (!current) return { kind: "not_found" };
    if (current.status !== patch.status) {
      payload.position = await nextPosition(client, userId, patch.status);
    }
  }

  let query = client.from("job_postings").update(payload).eq("id", id);
  // 낙관적 잠금: 클라이언트가 본 시점 이후로 값이 바뀌었으면 0행이 갱신된다.
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw asDomainError(error);
  if (data) return { kind: "updated", row: data };

  const current = await findJobPosting(client, id);
  return current ? { kind: "conflict", row: current } : { kind: "not_found" };
}

/** 삭제된 행이 있으면 true, 대상이 없으면 false. */
export async function deleteJobPosting(
  client: Client,
  id: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("job_postings")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/** 해당 컬럼의 마지막 카드 뒤에 붙을 position을 계산한다. */
async function nextPosition(
  client: Client,
  userId: string,
  status: JobStatusRow,
): Promise<number> {
  const { data, error } = await client
    .from("job_postings")
    .select("position")
    .eq("user_id", userId)
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.position ?? 0) + POSITION_STEP;
}

function asDomainError(error: { code?: string }): unknown {
  return error.code === UNIQUE_VIOLATION ? new DuplicateUrlError() : error;
}
