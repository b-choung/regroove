import { AddJobPostingButton } from "@/components/job-posting/add-job-posting-button";
import { BoardDialogs } from "@/components/job-posting/board-dialogs";
import { JobPostingBoard } from "@/components/job-posting/job-posting-board";
import { SkillProfileButton } from "@/components/skills/skill-profile-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function BoardPage() {
  // proxy.ts가 미인증 요청을 /login으로 보내므로 여기서는 user가 존재한다.
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">지원 현황</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <SkillProfileButton />
          <AddJobPostingButton />
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </header>

      <JobPostingBoard />

      {/* 모달은 보드 밖에 둔다. 보드 안에 있으면 목록 조회가 실패했을 때
          헤더 버튼이 아무 일도 하지 않는다. */}
      <BoardDialogs />
    </main>
  );
}
