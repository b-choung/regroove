import { ApiError } from "@/lib/api/errors";
import { apiRequest } from "@/lib/api/request";
import type {
  JobPosting,
  JobPostingInput,
  JobPostingUpdate,
} from "@/types/job-posting";

/**
 * 공고 API 클라이언트.
 *
 * 외부 채용 사이트는 물론 Supabase도 클라이언트에서 직접 호출하지 않고,
 * 전부 자체 API Route를 거친다. (RLS 외에 서버 검증을 한 겹 더 두려는 목적)
 */

const BASE_PATH = "/api/job-postings";

export async function fetchJobPostings(): Promise<JobPosting[]> {
  const { jobPostings } = await apiRequest<{ jobPostings: JobPosting[] }>(
    BASE_PATH,
  );
  return jobPostings;
}

export async function createJobPosting(
  input: JobPostingInput,
): Promise<JobPosting> {
  const { jobPosting } = await apiRequest<{ jobPosting: JobPosting }>(
    BASE_PATH,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return jobPosting;
}

export async function updateJobPosting(
  id: string,
  patch: JobPostingUpdate,
): Promise<JobPosting> {
  const { jobPosting } = await apiRequest<{ jobPosting: JobPosting }>(
    `${BASE_PATH}/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return jobPosting;
}

export async function deleteJobPosting(id: string): Promise<void> {
  await apiRequest<void>(`${BASE_PATH}/${id}`, { method: "DELETE" });
}

/**
 * 409 conflict 응답에 실려 온 서버 최신 공고.
 * "최신 상태 우선" 정책이라, 충돌 시 이 값으로 캐시를 덮어쓴다.
 */
export function conflictJobPosting(error: unknown): JobPosting | null {
  if (!(error instanceof ApiError) || error.code !== "conflict") return null;

  const body = error.body;
  if (typeof body !== "object" || body === null || !("jobPosting" in body)) {
    return null;
  }
  return (body as { jobPosting: JobPosting }).jobPosting;
}
