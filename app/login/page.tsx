import { Suspense } from "react";
import { DemoLogin } from "@/components/auth/demo-login";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { demoCredentials } from "@/lib/env/server";

export default function LoginPage() {
  // 데모 계정을 설정하지 않은 환경에서는 버튼을 그리지 않는다.
  const hasDemo = demoCredentials() !== null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Regroove</CardTitle>
          <CardDescription>
            이메일로 로그인 링크를 받아 접속합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* LoginForm이 useSearchParams를 쓰므로 Suspense 경계가 필요하다. */}
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <LoginForm />
          </Suspense>

          {hasDemo && (
            <>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-caption text-muted-foreground">또는</span>
                <Separator className="flex-1" />
              </div>
              <DemoLogin />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
