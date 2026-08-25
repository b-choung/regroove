import { z } from "zod";

/**
 * 클라이언트에도 실려도 되는 환경변수. (NEXT_PUBLIC_*)
 *
 * 서버 전용 키는 `lib/env/server.ts`에 따로 둔다. 한 파일에 같이 두면 클라이언트
 * 컴포넌트가 publicEnv 하나를 import 하는 순간 서버 쪽 스키마와 안내 문구까지
 * 브라우저 번들에 실린다. (실제로 그렇게 실려 있었다)
 */

// 값이 비어 있을 때 Zod 기본 메시지("Invalid input")만 뜨면 원인을 찾기 어려워서
// 어디서 무엇을 가져와야 하는지 메시지에 직접 적어둔다.
export const SETUP_HINT =
  ".env.local을 확인해주세요 (.env.example 참고). 배포 환경이면 Vercel > Settings > Environment Variables를 확인해주세요.";

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

export function publicEnv() {
  // Next.js는 process.env.NEXT_PUBLIC_* 를 빌드 시 정적으로 치환하므로
  // 구조 분해나 동적 접근이 아니라 리터럴로 참조해야 한다.
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
