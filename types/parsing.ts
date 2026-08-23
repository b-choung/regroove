import { z } from "zod";
import type { JobSource } from "@/types/job-posting";

/**
 * URL 파싱 결과 계약. (API Route ↔ 클라이언트 공용)
 *
 * 파싱 구현(`lib/parsing/`)은 cheerio·Anthropic SDK를 쓰는 서버 전용이라
 * 클라이언트가 참조할 타입만 여기 둔다.
 */

export const parseRequestSchema = z.object({
  url: z.string().url("올바른 URL이 아닙니다."),
});

/**
 * 어느 단계까지 내려가서 값을 채웠는지.
 * - jsonld/og: 페이지 메타데이터만으로 해결
 * - llm: 메타데이터가 부족해 Claude로 본문에서 추출
 * - manual: 자동 추출 실패, 사용자 입력 필요
 */
export const PARSE_STRATEGIES = ["jsonld", "og", "llm", "manual"] as const;
export type ParseStrategy = (typeof PARSE_STRATEGIES)[number];

/** 자동으로 채우려는 필드. missing 목록에 그대로 쓰인다. */
export const PARSED_FIELDS = [
  "title",
  "company",
  "deadline",
  "requiredSkills",
] as const;
export type ParsedField = (typeof PARSED_FIELDS)[number];

export const PARSED_FIELD_LABELS: Record<ParsedField, string> = {
  title: "공고 제목",
  company: "회사명",
  deadline: "마감일",
  requiredSkills: "기술스택",
};

export interface ParsedJobPosting {
  url: string;
  source: JobSource;
  title: string | null;
  company: string | null;
  /** ISO date (YYYY-MM-DD) */
  deadline: string | null;
  requiredSkills: string[];
  /** 파싱한 본문 텍스트. 저장해 두면 나중에 다시 긁지 않고 재추출할 수 있다. */
  rawContent: string | null;
  strategy: ParseStrategy;
  /** 자동으로 채우지 못한 필드. 폼에서 사용자에게 입력을 요청한다. */
  missing: ParsedField[];
  /** 사용자에게 보여줄 안내 (페이지 차단, 본문 잘림, LLM 미설정 등) */
  warnings: string[];
}
