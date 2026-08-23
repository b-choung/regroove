import { describe, expect, it, vi } from "vitest";
import { PageFetchError } from "./fetch-page";
import { parseJobPosting, type ParseDeps } from "./parse-job-posting";

/**
 * 폴백 체인 순서 테스트.
 *
 * 네트워크와 Claude 호출을 가짜로 바꿔 "어느 단계까지 내려갔는지"를 검증한다.
 * CLAUDE.md가 이 순서를 아키텍처 원칙으로 못박아 뒀으므로, 깨지면 바로 알아야 한다.
 */

const page = {
  html: "<html></html>",
  truncated: false,
  finalUrl: "https://www.wanted.co.kr/wd/12345",
};

const completeMetadata = {
  title: "프론트엔드 개발자",
  company: "토스",
  deadline: "2026-09-30",
  requiredSkills: ["TypeScript"],
  strategy: "jsonld" as const,
  text: "본문",
};

function deps(overrides: Partial<ParseDeps> = {}): ParseDeps {
  return {
    fetchPage: vi.fn(async () => page),
    extractMetadata: vi.fn(() => completeMetadata),
    extractWithClaude: vi.fn(async () => null),
    isClaudeConfigured: () => true,
    ...overrides,
  };
}

describe("parseJobPosting", () => {
  it("1단계로 다 채우면 Claude를 부르지 않는다", async () => {
    const withDeps = deps();
    const result = await parseJobPosting(page.finalUrl, withDeps);

    expect(withDeps.extractWithClaude).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      title: "프론트엔드 개발자",
      company: "토스",
      deadline: "2026-09-30",
      requiredSkills: ["TypeScript"],
      strategy: "jsonld",
      missing: [],
      source: "wanted",
    });
  });

  it("부족한 필드가 있으면 2단계로 내려가 빈 칸만 채운다", async () => {
    // known 인자를 확인하므로 시그니처를 명시한 mock을 쓴다.
    const extractWithClaude = vi.fn<ParseDeps["extractWithClaude"]>(
      async () => ({
        // 1단계가 이미 얻은 제목을 LLM이 다르게 말해도 1단계 값을 유지한다.
        title: "엉뚱한 제목",
        company: "토스",
        deadline: "2026-10-15",
        requiredSkills: ["React", "Next.js"],
      }),
    );

    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        extractMetadata: () => ({
          ...completeMetadata,
          company: null,
          deadline: null,
          requiredSkills: [],
          strategy: "og",
        }),
        extractWithClaude,
      }),
    );

    expect(extractWithClaude).toHaveBeenCalledOnce();
    expect(extractWithClaude.mock.calls[0]?.[0].known).toMatchObject({
      title: "프론트엔드 개발자",
      company: null,
    });
    expect(result).toMatchObject({
      title: "프론트엔드 개발자",
      company: "토스",
      deadline: "2026-10-15",
      requiredSkills: ["React", "Next.js"],
      strategy: "llm",
      missing: [],
    });
  });

  it("LLM이 날짜 아닌 마감일을 주면 버린다", async () => {
    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        extractMetadata: () => ({ ...completeMetadata, deadline: null }),
        extractWithClaude: async () => ({
          title: null,
          company: null,
          deadline: "상시채용",
          requiredSkills: [],
        }),
      }),
    );

    expect(result.deadline).toBeNull();
    expect(result.missing).toContain("deadline");
  });

  it("페이지를 못 가져오면 3단계(수동 입력)로 내려간다", async () => {
    const extractWithClaude = vi.fn(async () => null);
    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        fetchPage: async () => {
          throw new PageFetchError("status", "페이지를 가져오지 못했습니다.");
        },
        extractWithClaude,
      }),
    );

    expect(extractWithClaude).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      strategy: "manual",
      missing: ["title", "company", "deadline", "requiredSkills"],
    });
    expect(result.warnings).toContain("페이지를 가져오지 못했습니다.");
  });

  it("API 키가 없으면 2단계를 건너뛰고 안내를 남긴다", async () => {
    const extractWithClaude = vi.fn(async () => null);
    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        extractMetadata: () => ({ ...completeMetadata, requiredSkills: [] }),
        extractWithClaude,
        isClaudeConfigured: () => false,
      }),
    );

    expect(extractWithClaude).not.toHaveBeenCalled();
    // 1단계에서 얻은 값은 그대로 살린다.
    expect(result.title).toBe("프론트엔드 개발자");
    expect(result.missing).toEqual(["requiredSkills"]);
    expect(result.warnings.join()).toContain("ANTHROPIC_API_KEY");
  });

  it("2단계가 실패해도 1단계 결과는 유지한다", async () => {
    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        extractMetadata: () => ({
          ...completeMetadata,
          requiredSkills: [],
          strategy: "og",
        }),
        extractWithClaude: async () => null,
      }),
    );

    expect(result).toMatchObject({
      title: "프론트엔드 개발자",
      company: "토스",
      strategy: "og",
      missing: ["requiredSkills"],
    });
    expect(result.warnings.join()).toContain("직접 입력");
  });

  it("본문이 잘렸으면 사용자에게 알린다", async () => {
    const result = await parseJobPosting(
      page.finalUrl,
      deps({ fetchPage: async () => ({ ...page, truncated: true }) }),
    );

    expect(result.warnings.join()).toContain("앞부분만");
  });

  it("파싱이 다 실패해도 본문은 저장해 둔다", async () => {
    const result = await parseJobPosting(
      page.finalUrl,
      deps({
        extractMetadata: () => ({
          title: null,
          company: null,
          deadline: null,
          requiredSkills: [],
          strategy: null,
          text: "공고 본문 원문",
        }),
        extractWithClaude: async () => null,
      }),
    );

    expect(result.strategy).toBe("manual");
    expect(result.rawContent).toBe("공고 본문 원문");
  });
});
