"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 로그인 콜백이 실패했을 때 안내할 문구.
 *
 * 코드만 받아 여기서 문구로 바꾼다. 콜백이 넘긴 텍스트를 그대로 그리면 URL로
 * 아무 문구나 띄울 수 있다. 모르는 코드는 일반 문구로 흘린다.
 */
const CALLBACK_ERRORS: Record<string, string> = {
  missing_code:
    "로그인 링크가 올바르지 않습니다. 메일의 링크를 다시 눌러주세요.",
  exchange_failed:
    "로그인 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 받아주세요.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const errorCode = searchParams.get("error");
  const callbackError = errorCode
    ? (CALLBACK_ERRORS[errorCode] ?? "로그인을 완료하지 못했습니다.")
    : null;
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setIsSending(false);

    if (error) {
      toast.error("로그인 링크 전송에 실패했습니다.", {
        description: error.message,
      });
      return;
    }

    setIsSent(true);
  }

  if (isSent) {
    return (
      <p className="text-body text-muted-foreground">
        <span className="font-medium text-foreground">{email}</span> 로 로그인
        링크를 보냈습니다. 메일함을 확인해주세요.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {callbackError && (
        <p className="rounded-md bg-destructive-subtle px-3 py-2 text-caption text-destructive">
          {callbackError}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSending}>
        {isSending ? "전송 중..." : "로그인 링크 받기"}
      </Button>
    </form>
  );
}
