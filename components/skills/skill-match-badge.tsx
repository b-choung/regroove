"use client";

import { Badge } from "@/components/ui/badge";
import { useMySkills } from "@/hooks/use-skill-profile";
import { matchSkills, toPercent } from "@/lib/skills/match";
import { cn } from "@/lib/utils";

/**
 * 카드에 붙는 매칭률 배지.
 *
 * 스킬 프로필을 등록하지 않았으면 아무것도 그리지 않는다. 모든 카드에 0%가
 * 붙으면 정보가 아니라 잡음이다.
 */
export function SkillMatchBadge({
  requiredSkills,
}: {
  requiredSkills: string[];
}) {
  const mySkills = useMySkills();
  const percent = toPercent(matchSkills(requiredSkills, mySkills).rate);

  if (mySkills.length === 0 || percent === null) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "tabular-nums",
        percent >= 70 &&
          "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        percent < 40 &&
          "border-amber-500/40 text-amber-700 dark:text-amber-500",
      )}
    >
      스킬 {percent}%
    </Badge>
  );
}
