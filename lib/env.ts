import { z } from "zod";

/**
 * 환경변수 검증.
 *
 * 클라이언트 번들에 서버 전용 키가 섞이지 않도록 두 함수로 분리했다.
 * `serverEnv()`는 절대 클라이언트 컴포넌트에서 호출하지 않는다.
 */

// 값이 비어 있을 때 Zod 기본 메시지("Invalid input")만 뜨면 원인을 찾기 어려워서
// 어디서 무엇을 가져와야 하는지 메시지에 직접 적어둔다.
const SETUP_HINT = ".env.local을 확인해주세요 (.env.example 참고)";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(
    `NEXT_PUBLIC_SUPABASE_URL이 비어 있거나 URL 형식이 아닙니다. Supabase 대시보드 > Connect에서 Project URL을 복사해 ${SETUP_HINT}`,
  ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(
      1,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 비어 있습니다. Supabase 대시보드 > Settings > API Keys의 Publishable key를 복사해 ${SETUP_HINT}`,
    ),
});

const serverEnvSchema = z.object({
  ANTHROPIC_API_KEY: z
    .string()
    .min(
      1,
      `ANTHROPIC_API_KEY가 비어 있습니다. console.anthropic.com > API keys에서 발급해 ${SETUP_HINT}`,
    ),
});

export function publicEnv() {
  // Next.js는 process.env.NEXT_PUBLIC_* 를 빌드 시 정적으로 치환하므로
  // 구조 분해나 동적 접근이 아니라 리터럴로 참조해야 한다.
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function serverEnv() {
  return serverEnvSchema.parse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });
}
