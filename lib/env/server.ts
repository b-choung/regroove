// 클라이언트 컴포넌트가 이 모듈을 import 하면 빌드가 실패한다.
// 규율로만 지키던 경계를 컴파일 단계에서 막는다.
import "server-only";
import { z } from "zod";
import { SETUP_HINT } from "@/lib/env/public";

/** 서버에서만 읽는 환경변수. */
const serverEnvSchema = z.object({
  ANTHROPIC_API_KEY: z
    .string()
    .min(
      1,
      `ANTHROPIC_API_KEY가 비어 있습니다. console.anthropic.com > API keys에서 발급해 ${SETUP_HINT}`,
    ),
});

export function serverEnv() {
  return serverEnvSchema.parse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });
}

const demoEnvSchema = z.object({
  DEMO_EMAIL: z.email(),
  DEMO_PASSWORD: z.string().min(1),
});

/**
 * 데모 계정 자격증명. 설정하지 않았으면 null이고, 그러면 로그인 화면에서
 * "둘러보기" 버튼이 아예 나타나지 않는다. (환경변수 미설정 = 기능 비활성)
 *
 * 비밀번호는 서버에서만 읽는다. NEXT_PUBLIC_으로 두면 브라우저 번들에 박혀
 * 누구나 Supabase에 직접 로그인할 수 있게 된다.
 */
export function demoCredentials() {
  const parsed = demoEnvSchema.safeParse({
    DEMO_EMAIL: process.env.DEMO_EMAIL,
    DEMO_PASSWORD: process.env.DEMO_PASSWORD,
  });

  return parsed.success ? parsed.data : null;
}
