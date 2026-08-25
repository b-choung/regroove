import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <div className="space-y-1">
          <h1 className="text-body font-semibold">없는 주소입니다.</h1>
          <p className="text-caption text-muted-foreground">
            주소가 바뀌었거나 삭제된 화면일 수 있습니다.
          </p>
        </div>
        <Link href="/" className={buttonVariants()}>
          보드로 돌아가기
        </Link>
      </div>
    </main>
  );
}
