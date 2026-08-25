import { AddJobPostingButton } from "@/components/job-posting/add-job-posting-button";
import { AppNav } from "@/components/layout/app-nav";
import { SkillProfileButton } from "@/components/skills/skill-profile-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * 로그인 후 화면 공용 헤더.
 *
 * 제목만 페이지에서 받고 로그인 정보는 직접 읽는다. 이메일을 페이지가 넘겨주게
 * 하면 페이지마다 같은 조회를 다시 쓰게 된다. 여기서 여는 모달은 레이아웃의
 * `BoardDialogs`가 마운트한다.
 */
export async function AppHeader({ title }: { title: string }) {
  // proxy.ts가 미인증 요청을 /login으로 보내므로 여기서는 user가 존재한다.
  const user = await getCurrentUser();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-0.5">
        {/* 제목은 화면에서 가장 큰 글자를 차지하지 않는다. 그 자리는 숫자 몫이다. */}
        <h1 className="text-heading font-semibold tracking-tight">{title}</h1>
        <p className="text-caption text-muted-foreground">{user?.email}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AppNav />
        <Separator orientation="vertical" className="h-5" />
        <SkillProfileButton />
        <AddJobPostingButton />
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
