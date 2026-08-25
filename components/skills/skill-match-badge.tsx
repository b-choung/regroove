"use client";

import { Badge } from "@/components/ui/badge";
import { useMySkills } from "@/hooks/use-skill-profile";
import { matchSkills, toPercent } from "@/lib/skills/match";

/** 이 이상이면 포인트 컬러로 강조한다. */
const HIGH_MATCH = 70;

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

  // 초록·주황을 따로 쓰지 않는다. 팔레트 밖의 색을 늘리는 대신, 잘 맞는 공고만
  // 포인트 컬러로 올리고 나머지는 중립으로 둔다.
  return (
    <Badge
      variant={percent >= HIGH_MATCH ? "subtle" : "outline"}
      className="tabular-nums"
    >
      스킬 {percent}%
    </Badge>
  );
}
