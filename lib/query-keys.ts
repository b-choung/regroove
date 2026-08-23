/**
 * TanStack Query 키를 한곳에서 관리한다.
 * 낙관적 업데이트에서 setQueryData / invalidateQueries 대상 키가 흔들리면
 * 롤백이 조용히 실패하므로 문자열 리터럴을 각 파일에 흩뿌리지 않는다.
 */
export const queryKeys = {
  jobPostings: {
    all: ["job-postings"] as const,
    list: () => [...queryKeys.jobPostings.all, "list"] as const,
    detail: (id: string) =>
      [...queryKeys.jobPostings.all, "detail", id] as const,
  },
  notes: {
    all: ["notes"] as const,
    byJobPosting: (jobPostingId: string) =>
      [...queryKeys.notes.all, jobPostingId] as const,
  },
  skillProfile: {
    all: ["skill-profile"] as const,
    me: () => [...queryKeys.skillProfile.all, "me"] as const,
  },
} as const;
