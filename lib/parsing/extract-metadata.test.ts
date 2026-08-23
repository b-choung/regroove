import { describe, expect, it } from "vitest";
import { extractMetadata, toIsoDate } from "./extract-metadata";

describe("toIsoDate", () => {
  it("시각이 붙은 값에서 날짜만 남긴다", () => {
    expect(toIsoDate("2026-09-30T23:59:59+09:00")).toBe("2026-09-30");
  });

  it("날짜 형식이 아니면 null", () => {
    expect(toIsoDate("상시채용")).toBeNull();
    expect(toIsoDate(null)).toBeNull();
  });
});

describe("extractMetadata", () => {
  it("JSON-LD JobPosting에서 회사명·마감일·스킬을 뽑는다", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="OG 제목" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "프론트엔드 개발자",
            "hiringOrganization": { "@type": "Organization", "name": "토스" },
            "validThrough": "2026-09-30T23:59:59+09:00",
            "skills": ["TypeScript", "React"]
          }
        </script>
      </head><body><p>본문</p></body></html>
    `;

    const result = extractMetadata(html);

    expect(result).toMatchObject({
      title: "프론트엔드 개발자",
      company: "토스",
      deadline: "2026-09-30",
      requiredSkills: ["TypeScript", "React"],
      strategy: "jsonld",
    });
  });

  it("@graph 안에 들어 있어도 찾는다", () => {
    const html = `
      <script type="application/ld+json">
        {"@graph": [{"@type": "WebSite"}, {"@type": "JobPosting", "title": "백엔드 개발자"}]}
      </script>
    `;

    expect(extractMetadata(html).title).toBe("백엔드 개발자");
  });

  it("쉼표로 이어 붙인 skills 문자열도 나눈다", () => {
    const html = `
      <script type="application/ld+json">
        {"@type": "JobPosting", "title": "FE", "skills": "TypeScript, React · Next.js"}
      </script>
    `;

    expect(extractMetadata(html).requiredSkills).toEqual([
      "TypeScript",
      "React",
      "Next.js",
    ]);
  });

  // 채용 사이트가 깨진 JSON-LD를 내려주는 일이 흔하다. 그때 예외로 죽으면
  // 아래 단계(OG)로 못 내려간다.
  it("JSON-LD가 깨져 있으면 OG로 내려간다", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ "@type": "JobPosting", </script>
        <meta property="og:title" content="프론트엔드 개발자 채용" />
        <meta property="og:site_name" content="원티드" />
      </head><body></body></html>
    `;

    expect(extractMetadata(html)).toMatchObject({
      title: "프론트엔드 개발자 채용",
      company: "원티드",
      strategy: "og",
    });
  });

  it("메타데이터가 없으면 본문 텍스트만 돌려준다", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body><script>alert(1)</script><p>공고   본문</p></body></html>
    `;

    const result = extractMetadata(html);

    expect(result.strategy).toBeNull();
    expect(result.title).toBeNull();
    expect(result.text).toBe("공고 본문");
    // 스크립트·스타일 내용이 본문에 섞이면 LLM 입력이 오염된다.
    expect(result.text).not.toContain("alert");
    expect(result.text).not.toContain("color:red");
  });
});
