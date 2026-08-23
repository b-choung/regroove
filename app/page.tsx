import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { KANBAN_COLUMNS } from "@/types/job-posting";

export default async function BoardPage() {
  // proxy.ts가 미인증 요청을 /login으로 보내므로 여기서는 user가 존재한다.
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">지원 현황</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      {/* 2주차: 이 자리에 dnd-kit 칸반보드를 붙인다. */}
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {KANBAN_COLUMNS.map((column) => (
          <section
            key={column.status}
            className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
          >
            <h2 className="text-sm font-medium">{column.label}</h2>
            <p className="text-xs text-muted-foreground">준비 중</p>
          </section>
        ))}
      </div>
    </main>
  );
}
