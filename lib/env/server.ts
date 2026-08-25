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
