import {
  JOB_STATUSES,
  type JobPosting,
  type JobStatus,
} from "@/types/job-posting";

/**
 * 상태별로 공고를 나누고 컬럼 안에서 position 오름차순으로 정렬한다.
 *
 * 서버도 position으로 정렬해 보내지만, 낙관적 업데이트로 카드를 끼워 넣은
 * 직후에는 캐시 배열 순서가 어긋나므로 화면 직전에 한 번 더 정렬한다.
 * position이 같으면(같은 값으로 두 카드가 이동한 경우) createdAt으로 갈라
 * 렌더 순서가 흔들리지 않게 한다.
 */
export function groupByStatus(
  jobPostings: JobPosting[],
): Record<JobStatus, JobPosting[]> {
  const grouped = Object.fromEntries(
    JOB_STATUSES.map((status) => [status, [] as JobPosting[]]),
  ) as Record<JobStatus, JobPosting[]>;

  for (const jobPosting of jobPostings) {
    grouped[jobPosting.status].push(jobPosting);
  }

  for (const status of JOB_STATUSES) {
    grouped[status].sort(
      (a, b) =>
        a.position - b.position || a.createdAt.localeCompare(b.createdAt),
    );
  }

  return grouped;
}
