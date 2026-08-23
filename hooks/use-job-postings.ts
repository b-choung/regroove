"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  conflictJobPosting,
  createJobPosting,
  deleteJobPosting,
  fetchJobPostings,
  updateJobPosting,
} from "@/lib/api/job-postings";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting, JobPostingUpdate } from "@/types/job-posting";

/**
 * 공고 서버 상태 훅.
 *
 * 2주차 드래그앤드롭에서 onMutate 기반 낙관적 업데이트를 붙일 예정이라,
 * 목록 캐시를 항상 서버 응답으로 직접 갱신(setQueryData)해 둔다.
 * invalidate만 하면 드래그 직후 refetch 사이에 카드가 되돌아가 보인다.
 */
export function useJobPostings() {
  return useQuery({
    queryKey: queryKeys.jobPostings.list(),
    queryFn: fetchJobPostings,
  });
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJobPosting,
    onSuccess: (created) => {
      queryClient.setQueryData<JobPosting[]>(
        queryKeys.jobPostings.list(),
        (previous) => [...(previous ?? []), created],
      );
      toast.success("공고를 추가했습니다.");
    },
  });
}

export function useUpdateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: JobPostingUpdate }) =>
      updateJobPosting(id, patch),
    onSuccess: (updated) => {
      replaceInList(queryClient, updated);
    },
    onError: (error) => {
      // 동시 편집 충돌: 서버가 최신 상태를 함께 보내주므로 그 값으로 맞춘다.
      const latest = conflictJobPosting(error);
      if (!latest) return;

      replaceInList(queryClient, latest);
      toast.warning("다른 곳에서 먼저 수정된 공고입니다.", {
        description: "화면을 서버의 최신 내용으로 갱신했습니다.",
      });
    },
  });
}

export function useDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteJobPosting,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<JobPosting[]>(
        queryKeys.jobPostings.list(),
        (previous) => previous?.filter((item) => item.id !== id) ?? [],
      );
      toast.success("공고를 삭제했습니다.");
    },
  });
}

type QueryClientLike = ReturnType<typeof useQueryClient>;

function replaceInList(queryClient: QueryClientLike, next: JobPosting) {
  queryClient.setQueryData<JobPosting[]>(
    queryKeys.jobPostings.list(),
    (previous) =>
      previous?.map((item) => (item.id === next.id ? next : item)) ?? [next],
  );
  queryClient.setQueryData(queryKeys.jobPostings.detail(next.id), next);
}
