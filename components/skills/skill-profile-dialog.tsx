"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useSaveSkillProfile,
  useSkillProfile,
} from "@/hooks/use-skill-profile";
import { useUiStore } from "@/stores/ui-store";
import type {
  UserSkillProfile,
  UserSkillProfileInput,
} from "@/types/job-posting";

const FORM_ID = "skill-profile-form";

/** 내 기술스택과 경력. 공고 매칭률 계산의 기준값이다. */
export function SkillProfileDialog() {
  const isOpen = useUiStore((state) => state.isSkillProfileDialogOpen);
  const close = useUiStore((state) => state.closeSkillProfileDialog);
  const { data, isPending } = useSkillProfile();
  const save = useSaveSkillProfile();

  function handleSave(input: UserSkillProfileInput) {
    save.mutate(input, { onSuccess: close });
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>내 스킬</DialogTitle>
          <DialogDescription>
            등록한 스택을 공고의 요구 스택과 비교해 매칭률을 보여줍니다.
          </DialogDescription>
        </DialogHeader>

        {/*
          저장된 값이 도착한 뒤에 입력칸을 mount 한다. 먼저 그려 두고 effect로
          값을 밀어 넣으면 사용자가 입력하는 중에 서버 응답이 덮어쓸 수 있다.
          (다이얼로그를 닫으면 내용이 unmount 되므로 다음에 열 때 다시 채워진다)
        */}
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ProfileFields profile={data ?? null} onSubmit={handleSave} />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            취소
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isPending || save.isPending}
          >
            {save.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileFields({
  profile,
  onSubmit,
}: {
  profile: UserSkillProfile | null;
  onSubmit: (input: UserSkillProfileInput) => void;
}) {
  const [skills, setSkills] = useState(() => profile?.skills.join(", ") ?? "");
  const [experienceYears, setExperienceYears] = useState(() =>
    String(profile?.experienceYears ?? 0),
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      // 빈 칸이나 숫자가 아닌 값은 0년으로 둔다. (서버 스키마가 한 번 더 검증한다)
      experienceYears: Number(experienceYears) || 0,
    });
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="skill-profile-skills">기술스택</Label>
        <Textarea
          id="skill-profile-skills"
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="TypeScript, React, Next.js, Node.js"
          rows={4}
        />
        <p className="text-caption text-muted-foreground">
          쉼표로 구분합니다. 표기가 달라도(React.js / 리액트) 같은 스택으로
          인식합니다.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="skill-profile-years">경력 (년)</Label>
        <Input
          id="skill-profile-years"
          type="number"
          min={0}
          max={70}
          step={0.5}
          value={experienceYears}
          onChange={(event) => setExperienceYears(event.target.value)}
        />
      </div>
    </form>
  );
}
