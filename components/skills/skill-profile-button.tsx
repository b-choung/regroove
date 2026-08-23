"use client";

import { UserRoundCogIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

/** 서버 컴포넌트인 보드 페이지 헤더에서 스킬 프로필 모달을 열기 위한 래퍼. */
export function SkillProfileButton() {
  const open = useUiStore((state) => state.openSkillProfileDialog);

  return (
    <Button variant="outline" size="sm" onClick={open}>
      <UserRoundCogIcon />내 스킬
    </Button>
  );
}
