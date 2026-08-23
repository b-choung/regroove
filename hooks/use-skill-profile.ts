"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchSkillProfile, saveSkillProfile } from "@/lib/api/skill-profile";
import { queryKeys } from "@/lib/query-keys";
import type { UserSkillProfile } from "@/types/job-posting";

/**
 * 내 스킬 프로필.
 *
 * 카드마다 매칭률을 계산하려고 이 훅을 여러 번 부르는데, TanStack Query가 같은
 * 키의 요청을 합쳐 주므로 네트워크 요청은 한 번이다.
 */
export function useSkillProfile() {
  return useQuery({
    queryKey: queryKeys.skillProfile.me(),
    queryFn: fetchSkillProfile,
    // 프로필은 거의 바뀌지 않는다. 보드를 오래 열어 둬도 다시 받아올 필요가 없다.
    staleTime: 10 * 60 * 1000,
  });
}

/** 프로필을 저장한 적이 없으면 빈 스킬로 취급한다. */
export function useMySkills(): string[] {
  const { data } = useSkillProfile();
  return data?.skills ?? [];
}

export function useSaveSkillProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveSkillProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData<UserSkillProfile>(
        queryKeys.skillProfile.me(),
        saved,
      );
      toast.success("스킬 프로필을 저장했습니다.");
    },
    onError: (error) =>
      toast.error("스킬 프로필을 저장하지 못했습니다.", {
        description: error.message,
      }),
  });
}
