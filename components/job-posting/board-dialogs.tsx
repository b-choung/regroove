"use client";

import { CreateJobPostingDialog } from "@/components/job-posting/create-job-posting-dialog";
import { DeleteJobPostingDialog } from "@/components/job-posting/delete-job-posting-dialog";
import { EditJobPostingDialog } from "@/components/job-posting/edit-job-posting-dialog";
import { SkillProfileDialog } from "@/components/skills/skill-profile-dialog";

/**
 * 보드에서 여는 모달 묶음.
 *
 * 보드 컴포넌트 안이 아니라 레이아웃에서 따로 마운트한다. 보드 안에 두면 목록
 * 조회가 로딩·실패 상태일 때 모달이 트리에 없어서, 헤더의 "공고 추가"·"내 스킬"
 * 버튼이 상태만 바꾸고 아무 일도 일어나지 않는다. (공고를 못 불러오는 상황에서
 * 오히려 공고를 추가하고 싶을 텐데, 그때 버튼이 죽어 있었다)
 */
export function BoardDialogs() {
  return (
    <>
      <CreateJobPostingDialog />
      <EditJobPostingDialog />
      <DeleteJobPostingDialog />
      <SkillProfileDialog />
    </>
  );
}
