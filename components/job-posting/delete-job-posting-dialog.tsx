"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteJobPosting, useJobPostings } from "@/hooks/use-job-postings";
import { useUiStore } from "@/stores/ui-store";

/**
 * 삭제 확인 모달.
 *
 * 카드에 삭제 버튼을 두면 드래그 손잡이 바로 옆이라 잘못 누르기 쉽다. 되돌리기가
 * 없고 메모까지 함께 지워지므로(FK on delete cascade) 확인을 한 단계 둔다.
 */
export function DeleteJobPostingDialog() {
  const pendingId = useUiStore((state) => state.pendingDeleteJobPostingId);
  const requestDelete = useUiStore((state) => state.requestDeleteJobPosting);
  const { data } = useJobPostings();
  // 목록 캐시에서 찾는다. 다른 곳에서 이미 사라졌으면 null이 되어 닫힌다.
  const jobPosting =
    data?.find((candidate) => candidate.id === pendingId) ?? null;
  const remove = useDeleteJobPosting();

  function handleDelete() {
    if (!jobPosting) return;

    remove.mutate(jobPosting.id, {
      onSuccess: () => requestDelete(null),
      onError: (error) =>
        toast.error("공고를 삭제하지 못했습니다.", {
          description: error.message,
        }),
    });
  }

  return (
    <Dialog
      open={jobPosting !== null}
      onOpenChange={(open) => {
        if (!open) requestDelete(null);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>공고를 삭제할까요?</DialogTitle>
          <DialogDescription>
            {jobPosting?.company} · {jobPosting?.title}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          이 공고에 남긴 메모까지 함께 지워지고, 되돌릴 수 없습니다.
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => requestDelete(null)}
            disabled={remove.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={remove.isPending}
          >
            {remove.isPending ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
