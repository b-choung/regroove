"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMySkills } from "@/hooks/use-skill-profile";
import { matchSkills, toPercent } from "@/lib/skills/match";

/**
 * 상세 화면의 스킬 매칭 요약.
 *
 * 비율만 보여주면 어디가 안 맞는지 알 수 없어서, 겹치는 스택과 없는 스택을
 * 공고 표기 그대로 나열한다. 정규화가 잘못 묶었을 때도 눈으로 바로 잡힌다.
 */
export function SkillMatchSummary({
  requiredSkills,
}: {
  requiredSkills: string[];
}) {
  const mySkills = useMySkills();
  const { rate, matched, missing } = matchSkills(requiredSkills, mySkills);
  const percent = toPercent(rate);

  return (
    <section className="space-y-2.5 border-t pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-semibold">스킬 매칭</h3>
        {percent !== null && mySkills.length > 0 && (
          <span className="text-body font-semibold tabular-nums">
            {percent}%
          </span>
        )}
      </div>

      {percent === null ? (
        <p className="text-caption text-muted-foreground">
          이 공고에 기술스택 정보가 없습니다.
        </p>
      ) : mySkills.length === 0 ? (
        <p className="text-caption text-muted-foreground">
          헤더의 &quot;내 스킬&quot;에서 기술스택을 등록하면 매칭률을
          보여줍니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {matched.map((skill) => (
            <li key={skill}>
              {/* 겹치는 스택만 포인트 컬러. 없는 스택은 점선 테두리로 비운다. */}
              <Badge variant="subtle" className="gap-1">
                <CheckIcon className="size-3" />
                {skill}
              </Badge>
            </li>
          ))}
          {missing.map((skill) => (
            <li key={skill}>
              <Badge
                variant="outline"
                className="gap-1 border-dashed text-muted-foreground"
              >
                <MinusIcon className="size-3" />
                {skill}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
