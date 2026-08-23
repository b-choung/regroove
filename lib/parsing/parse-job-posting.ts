import {
  extractWithClaude as defaultExtractWithClaude,
  isClaudeConfigured as defaultIsClaudeConfigured,
  type ClaudeExtraction,
  type KnownFields,
} from "@/lib/parsing/extract-with-claude";
import {
  extractMetadata as defaultExtractMetadata,
  toIsoDate,
  type PageMetadata,
} from "@/lib/parsing/extract-metadata";
import {
  PageFetchError,
  fetchPage as defaultFetchPage,
  type FetchedPage,
} from "@/lib/parsing/fetch-page";
import { detectSource } from "@/lib/parsing/source";
import {
  PARSED_FIELDS,
  type ParsedField,
  type ParsedJobPosting,
  type ParseStrategy,
} from "@/types/parsing";

/**
 * 공고 URL 파싱 폴백 체인.
 *
 *   1단계: 구조화 메타데이터 (JSON-LD → OG)
 *     │ 부족한 필드가 남으면
 *     ▼
 *   2단계: Claude가 본문에서 빈 필드만 채움
 *     │ 그래도 남으면
 *     ▼
 *   3단계: missing 목록으로 사용자에게 수동 입력 요청
 *
 * 2단계를 "실패했을 때만"이 아니라 "부족할 때" 호출하는 이유: OG만 있는 페이지는
 * 제목만 얻고 회사명·마감일·기술스택이 비는데, 그대로 넘기면 자동 추출의 의미가
 * 거의 없다. 이미 채운 필드는 known으로 넘겨 다시 묻지 않는다.
 */

/**
 * 저장할 원문 길이 상한. 본문 전체는 2단계 추출에 그대로 쓰고, DB와 폼에는
 * 이만큼만 남긴다. (공고 한 건이 수십만 자면 폼 textarea가 사용 불가능해진다)
 */
const RAW_CONTENT_LIMIT = 20_000;

export interface ParseDeps {
  fetchPage: (url: string) => Promise<FetchedPage>;
  extractMetadata: (html: string) => PageMetadata;
  extractWithClaude: (args: {
    text: string;
    known: KnownFields;
  }) => Promise<ClaudeExtraction | null>;
  isClaudeConfigured: () => boolean;
}

const defaultDeps: ParseDeps = {
  fetchPage: defaultFetchPage,
  extractMetadata: defaultExtractMetadata,
  extractWithClaude: defaultExtractWithClaude,
  isClaudeConfigured: defaultIsClaudeConfigured,
};

export async function parseJobPosting(
  url: string,
  deps: ParseDeps = defaultDeps,
): Promise<ParsedJobPosting> {
  const source = detectSource(url);
  const warnings: string[] = [];

  let page: FetchedPage;
  try {
    page = await deps.fetchPage(url);
  } catch (error) {
    // 페이지를 못 가져오면 채울 근거가 아예 없다. 바로 3단계로 내려간다.
    warnings.push(
      error instanceof PageFetchError
        ? error.message
        : "페이지를 가져오지 못했습니다.",
    );
    return manualResult(url, source, warnings);
  }

  if (page.truncated) {
    warnings.push(
      "페이지가 너무 커서 앞부분만 읽었습니다. 빠진 내용이 있는지 확인해주세요.",
    );
  }

  const metadata = deps.extractMetadata(page.html);
  let fields: KnownFields = {
    title: metadata.title,
    company: metadata.company,
    deadline: toIsoDate(metadata.deadline),
    requiredSkills: metadata.requiredSkills,
  };
  let strategy: ParseStrategy = metadata.strategy ?? "manual";

  if (missingFields(fields).length > 0) {
    if (!deps.isClaudeConfigured()) {
      warnings.push(
        "ANTHROPIC_API_KEY가 없어 본문 자동 추출을 건너뛰었습니다.",
      );
    } else {
      const extracted = await deps.extractWithClaude({
        text: metadata.text,
        known: fields,
      });

      if (extracted) {
        fields = fillGaps(fields, extracted);
        strategy = "llm";
      } else {
        warnings.push(
          "본문 자동 추출에 실패했습니다. 남은 항목은 직접 입력해주세요.",
        );
      }
    }
  }

  const missing = missingFields(fields);

  if (metadata.text.length > RAW_CONTENT_LIMIT) {
    warnings.push("공고 원문이 길어 앞부분만 저장합니다.");
  }

  return {
    url: page.finalUrl,
    source,
    ...fields,
    // 파싱이 다 실패해도 본문은 저장해 둔다. 나중에 페이지가 내려가거나
    // 스킬을 다시 추출할 때 다시 긁지 않아도 된다.
    rawContent: metadata.text.slice(0, RAW_CONTENT_LIMIT) || null,
    strategy: missing.length === PARSED_FIELDS.length ? "manual" : strategy,
    missing,
    warnings,
  };
}

/** 빈 필드만 덮어쓴다. 1단계에서 얻은 값이 LLM 추측보다 신뢰도가 높다. */
function fillGaps(
  fields: KnownFields,
  extracted: ClaudeExtraction,
): KnownFields {
  return {
    title: fields.title ?? clean(extracted.title),
    company: fields.company ?? clean(extracted.company),
    // LLM이 "상시채용"처럼 날짜가 아닌 값을 넣을 수 있어 형식을 다시 검사한다.
    deadline: fields.deadline ?? toIsoDate(clean(extracted.deadline)),
    requiredSkills:
      fields.requiredSkills.length > 0
        ? fields.requiredSkills
        : extracted.requiredSkills.map((skill) => skill.trim()).filter(Boolean),
  };
}

function missingFields(fields: KnownFields): ParsedField[] {
  return PARSED_FIELDS.filter((field) =>
    field === "requiredSkills"
      ? fields.requiredSkills.length === 0
      : fields[field] === null,
  );
}

function manualResult(
  url: string,
  source: ParsedJobPosting["source"],
  warnings: string[],
): ParsedJobPosting {
  return {
    url,
    source,
    title: null,
    company: null,
    deadline: null,
    requiredSkills: [],
    rawContent: null,
    strategy: "manual",
    missing: [...PARSED_FIELDS],
    warnings,
  };
}

function clean(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
