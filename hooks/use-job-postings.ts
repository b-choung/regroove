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
import { applyMovePlan, type MovePlan } from "@/lib/job-postings/position";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting, JobPostingUpdate } from "@/types/job-posting";

/**
 * 공고 서버 상태 훅.
 *
 * 목록 캐시는 invalidate만 하지 않고 서버 응답으로 직접 갱신(setQueryData)한다.
 * refetch가 끝나기 전까지 카드가 이전 위치로 되돌아가 보이기 때문이다.
 * 카드 이동은 낙관적 업데이트가 필요해 useMoveJobPosting으로 따로 뺐다.
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

interface MoveVariables {
  activeId: string;
  plan: MovePlan;
  /** 드래그를 시작한 시점에 화면이 보고 있던 updatedAt (낙관적 잠금) */
  expectedUpdatedAt: string;
}

/**
 * 카드 이동(컬럼 변경 + 위치 변경) 전용 뮤테이션.
 *
 * 드래그는 서버 응답을 기다리면 카드가 손에서 놓친 자리로 튀어 보이므로,
 * onMutate에서 캐시를 먼저 고치고 실패하면 onError에서 스냅샷으로 되돌린다.
 */
export function useMoveJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activeId,
      plan,
      expectedUpdatedAt,
    }: MoveVariables) => {
      const active = plan.updates.find((update) => update.id === activeId);
      if (!active) throw new Error("이동할 카드가 계획에 없습니다.");

      const moved = await updateJobPosting(activeId, {
        status: plan.status,
        position: active.position,
        expectedUpdatedAt,
      });

      // 재정렬(rebalance)로 함께 번호를 다시 매긴 카드들. 위치만 정리하는
      // 후속 작업이라 낙관적 잠금을 걸지 않는다. (걸면 남이 만진 카드 하나 때문에
      // 정렬 복구가 통째로 막힌다.)
      const others = plan.updates.filter((update) => update.id !== activeId);
      if (others.length > 0) {
        await Promise.all(
          others.map((update) =>
            updateJobPosting(update.id, { position: update.position }),
          ),
        );
      }

      return moved;
    },

    onMutate: async ({ activeId, plan }) => {
      // 진행 중인 refetch가 낙관적 상태를 덮어쓰지 못하게 먼저 취소한다.
      await queryClient.cancelQueries({
        queryKey: queryKeys.jobPostings.list(),
      });

      const previous = queryClient.getQueryData<JobPosting[]>(
        queryKeys.jobPostings.list(),
      );

      queryClient.setQueryData<JobPosting[]>(
        queryKeys.jobPostings.list(),
        (current) => applyMovePlan(current ?? [], activeId, plan),
      );

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.jobPostings.list(),
          context.previous,
        );
      }

      const latest = conflictJobPosting(error);
      if (latest) {
        replaceInList(queryClient, latest);
        toast.warning("다른 곳에서 먼저 옮긴 공고입니다.", {
          description: "서버의 최신 위치로 되돌렸습니다.",
        });
        return;
      }

      toast.error("카드를 옮기지 못했습니다.", { description: error.message });
    },

    // 성공이든 실패든 서버 순서를 다시 읽어 화면과 DB를 맞춘다.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.list() }),
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
