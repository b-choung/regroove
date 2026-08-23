import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Regroove</CardTitle>
          <CardDescription>
            이메일로 로그인 링크를 받아 접속합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LoginForm이 useSearchParams를 쓰므로 Suspense 경계가 필요하다. */}
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
