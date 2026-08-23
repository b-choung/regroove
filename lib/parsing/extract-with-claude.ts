import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

/**
 * 파싱 체인 2단계: 메타데이터로 못 채운 필드를 본문에서 뽑는다.
 *
 * 구조화 출력(zodOutputFormat)을 쓰는 이유는, 프롬프트로 "JSON만 답해"라고
 * 부탁하면 앞뒤에 설명이 붙어 파싱이 깨지기 때문이다. 스키마를 API에 넘기면
 * 응답이 스키마를 만족하도록 제약된다.
 */

const extractionSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  deadline: z.string().nullable(),
  requiredSkills: z.array(z.string()),
});

export type ClaudeExtraction = z.infer<typeof extractionSchema>;

const SYSTEM_PROMPT = `당신은 한국 채용 공고 페이지의 본문에서 정보를 추출하는 도구입니다.

규칙:
- 본문에 실제로 있는 내용만 채웁니다. 추측하거나 만들어내지 않습니다.
- 찾을 수 없는 값은 null(배열은 빈 배열)로 둡니다.
- company는 채용하는 회사 이름입니다. 공고를 게시한 채용 플랫폼 이름(사람인, 원티드, 잡플래닛)이 아닙니다.
- deadline은 YYYY-MM-DD 형식입니다. "상시채용", "채용 시 마감"처럼 날짜가 없으면 null입니다.
- requiredSkills는 기술 스택만 담습니다. 통용되는 표기를 씁니다(예: TypeScript, React, Next.js).
  "커뮤니케이션 능력", "성장 의지" 같은 소프트 스킬이나 학력·경력 조건은 넣지 않습니다.`;

/** 파싱 체인이 이미 알아낸 값. 이미 채운 필드는 다시 묻지 않는다. */
export interface KnownFields {
  title: string | null;
  company: string | null;
  deadline: string | null;
  requiredSkills: string[];
}

export interface ExtractWithClaudeArgs {
  /** 페이지 본문 텍스트 */
  text: string;
  known: KnownFields;
}

/** ANTHROPIC_API_KEY가 없으면 2단계를 건너뛴다. (환경변수 미설정 = 기능 비활성) */
export function isClaudeConfigured(): boolean {
  try {
    serverEnv();
    return true;
  } catch {
    return false;
  }
}

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({
    apiKey: serverEnv().ANTHROPIC_API_KEY,
    // 공고 하나 추출은 길어도 1분 안에 끝난다. 사용자가 다이얼로그에서
    // 기다리는 요청이라 SDK 기본값(10분)보다 짧게 잡는다. (단위: ms)
    timeout: 60_000,
    maxRetries: 2,
  });
  return client;
}

/**
 * 실패하면 null을 돌려준다. (호출부가 3단계 = 수동 입력으로 내려갈 수 있게)
 * 던지지 않는 이유: 이 단계 실패는 예외 상황이 아니라 폴백 체인의 정상 경로다.
 */
export async function extractWithClaude({
  text,
  known,
}: ExtractWithClaudeArgs): Promise<ClaudeExtraction | null> {
  if (!text.trim()) return null;

  try {
    const response = await getClient().beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16_000,
      // 정책상 거절되면 대체 모델로 한 번 더 시도한다.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        format: zodOutputFormat(extractionSchema),
        // 단순 추출이라 깊게 생각할 필요가 없다. 비용과 대기 시간을 줄인다.
        effort: "low",
      },
      messages: [
        {
          role: "user",
          content: [
            `이미 알아낸 값(그대로 두거나, 본문과 다르면 바로잡아 주세요):`,
            JSON.stringify(known, null, 2),
            "",
            "공고 페이지 본문:",
            text,
          ].join("\n"),
        },
      ],
    });

    // 거절이면 content가 비어 있을 수 있으므로 먼저 확인한다.
    if (response.stop_reason === "refusal") return null;

    return response.parsed_output ?? null;
  } catch (error) {
    console.error("[parsing] Claude 추출 실패", error);
    return null;
  }
}
