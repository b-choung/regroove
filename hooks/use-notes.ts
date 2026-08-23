"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createNote, deleteNote, fetchNotes } from "@/lib/api/notes";
import { queryKeys } from "@/lib/query-keys";
import type { Note } from "@/types/job-posting";

/**
 * 공고별 메모.
 *
 * 상세 다이얼로그가 닫혀 있을 때는 jobPostingId가 null이라 쿼리를 끈다.
 * (다이얼로그를 열 때마다 그 공고의 메모만 가져온다)
 */
export function useNotes(jobPostingId: string | null) {
  return useQuery({
    queryKey: queryKeys.notes.byJobPosting(jobPostingId ?? "none"),
    queryFn: () => fetchNotes(jobPostingId!),
    enabled: jobPostingId !== null,
  });
}

export function useCreateNote(jobPostingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createNote(jobPostingId, { content }),
    onSuccess: (created) => {
      // 목록은 최신순이므로 새 메모를 맨 앞에 붙인다.
      queryClient.setQueryData<Note[]>(
        queryKeys.notes.byJobPosting(jobPostingId),
        (previous) => [created, ...(previous ?? [])],
      );
    },
    onError: (error) =>
      toast.error("메모를 저장하지 못했습니다.", {
        description: error.message,
      }),
  });
}

export function useDeleteNote(jobPostingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Note[]>(
        queryKeys.notes.byJobPosting(jobPostingId),
        (previous) => previous?.filter((note) => note.id !== id) ?? [],
      );
    },
    onError: (error) =>
      toast.error("메모를 삭제하지 못했습니다.", {
        description: error.message,
      }),
  });
}
