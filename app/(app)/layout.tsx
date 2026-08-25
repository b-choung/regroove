import { BoardDialogs } from "@/components/job-posting/board-dialogs";

/**
 * 로그인 후 화면(보드·대시보드) 공용 셸.
 *
 * 모달을 여기서 마운트한다. 페이지 안에 두면 목록 조회가 로딩·실패 상태일 때
 * 트리에서 사라져 헤더의 "공고 추가"·"내 스킬" 버튼이 아무 일도 하지 않는다.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col gap-7 p-6 lg:p-8">
      {children}
      <BoardDialogs />
    </main>
  );
}
