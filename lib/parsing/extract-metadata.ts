import * as cheerio from "cheerio";
import type { ParseStrategy } from "@/types/parsing";

/**
 * 페이지 HTML에서 구조화 메타데이터를 뽑는다. (파싱 체인 1단계)
 *
 * 순서는 schema.org JobPosting(JSON-LD) → OG 메타태그다. JSON-LD를 먼저 보는
 * 이유는 회사명·마감일·기술스택이 필드로 들어 있어서인데, OG에는 제목과
 * 사이트 이름 정도만 있어 회사명조차 부정확하다. 둘 다 실패하면 본문 텍스트만
 * 돌려주고, 그 텍스트를 2단계(Claude)가 받는다.
 */

export interface PageMetadata {
  title: string | null;
  company: string | null;
  deadline: string | null;
  requiredSkills: string[];
  /** 값을 하나라도 채운 단계. 아무것도 못 찾으면 null. */
  strategy: Extract<ParseStrategy, "jsonld" | "og"> | null;
  /** 스크립트·스타일을 걷어낸 본문 텍스트 */
  text: string;
}

export function extractMetadata(html: string): PageMetadata {
  const $ = cheerio.load(html);
  const text = extractText($);

  const jsonLd = fromJsonLd($);
  if (jsonLd) return { ...jsonLd, strategy: "jsonld", text };

  const og = fromOpenGraph($);
  if (og) return { ...og, strategy: "og", text };

  return {
    title: null,
    company: null,
    deadline: null,
    requiredSkills: [],
    strategy: null,
    text,
  };
}

type Fields = Omit<PageMetadata, "strategy" | "text">;

function fromJsonLd($: cheerio.CheerioAPI): Fields | null {
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).text();
    if (!raw.trim()) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 사이트가 깨진 JSON-LD를 내려주는 경우가 흔하다. 다음 블록으로 넘어간다.
      continue;
    }

    const posting = findJobPosting(parsed);
    if (!posting) continue;

    return {
      title: text(posting.title),
      company: text(readPath(posting, "hiringOrganization", "name")),
      deadline: toIsoDate(text(posting.validThrough)),
      requiredSkills: toSkillList(posting.skills ?? posting.knowsAbout),
    };
  }

  return null;
}

function fromOpenGraph($: cheerio.CheerioAPI): Fields | null {
  const meta = (property: string) =>
    text(
      $(`meta[property="${property}"]`).attr("content") ??
        $(`meta[name="${property}"]`).attr("content"),
    );

  const title =
    meta("og:title") ?? meta("twitter:title") ?? text($("title").text());
  // og:site_name은 "원티드"처럼 사이트 이름이 오기도 해서 회사명으로 못 쓴다.
  // 채용 사이트가 채워주는 경우에만 값이 맞으므로 2단계에서 다시 확인한다.
  const company = meta("og:site_name");

  if (!title && !company) return null;

  return { title, company, deadline: null, requiredSkills: [] };
}

/** JSON-LD는 배열·@graph·중첩으로 오므로 재귀로 JobPosting을 찾는다. */
function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof node !== "object" || node === null) return null;

  const record = node as Record<string, unknown>;
  const type = record["@type"];
  const isJobPosting = Array.isArray(type)
    ? type.includes("JobPosting")
    : type === "JobPosting";

  if (isJobPosting) return record;

  return findJobPosting(record["@graph"]);
}

/**
 * 본문 텍스트를 뽑는다.
 *
 * 원본 DOM에서 바로 script를 지우면 JSON-LD까지 함께 사라져서 1단계가 통째로
 * 실패한다(그렇게 한 번 깨졌다). 그래서 body를 복제한 뒤 지운다.
 */
function extractText($: cheerio.CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, iframe, svg").remove();
  return body.text().replace(/\s+/g, " ").trim();
}

function readPath(record: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed === "" ? null : trimmed;
}

/** skills는 문자열 하나로 오기도 하고 배열로 오기도 한다. */
function toSkillList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => text(item)?.split(/[,·|/]/) ?? [])
    .map((skill) => skill.trim())
    .filter(Boolean);
}

/** validThrough는 `2026-09-30T23:59:59+09:00`처럼 시각까지 올 수 있다. */
export function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : null;
}
