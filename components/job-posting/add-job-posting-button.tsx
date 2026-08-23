"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

/** 서버 컴포넌트인 보드 페이지 헤더에서 추가 모달을 열기 위한 얇은 래퍼. */
export function AddJobPostingButton() {
  const openCreateDialog = useUiStore((state) => state.openCreateDialog);

  return (
    <Button size="sm" onClick={openCreateDialog}>
      <PlusIcon />
      공고 추가
    </Button>
  );
}
