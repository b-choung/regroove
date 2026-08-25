"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "보드" },
  { href: "/dashboard", label: "대시보드" },
] as const;

/** 보드 ↔ 대시보드 이동. 현재 위치는 색과 aria-current로 함께 알린다. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="화면 이동" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            // 색만으로 현재 위치를 알리면 스크린리더에서 구분되지 않는다.
            aria-current={isActive ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              // 활성 탭은 포인트 컬러의 배경 버전. 회색 배경으로는 "지금 여기"가
              // 비활성 버튼의 hover와 구분되지 않았다.
              isActive &&
                "bg-primary-subtle text-primary-subtle-foreground hover:bg-primary-subtle",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
