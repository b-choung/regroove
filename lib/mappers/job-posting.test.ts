import { describe, expect, it } from "vitest";
import type { JobPostingRow } from "@/types/database";
import {
  jobPostingInputSchema,
  jobPostingUpdateSchema,
} from "@/types/job-posting";
import { toJobPosting, toJobPostingUpdate } from "./job-posting";

const row: JobPostingRow = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "22222222-2222-2222-2222-222222222222",
  url: "https://www.wanted.co.kr/wd/12345",
  company: "토스",
  title: "프론트엔드 개발자",
  deadline: "2026-09-30",
  required_skills: ["TypeScript", "React"],
  status: "applied",
  source: "wanted",
  raw_content: null,
  position: 1024,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-02T00:00:00.000Z",
};

describe("toJobPosting", () => {
  it("snake_case row를 camelCase 도메인 객체로 변환한다", () => {
    expect(toJobPosting(row)).toEqual({
      id: row.id,
      userId: row.user_id,
      url: row.url,
      company: "토스",
      title: "프론트엔드 개발자",
      deadline: "2026-09-30",
      requiredSkills: ["TypeScript", "React"],
      status: "applied",
      source: "wanted",
      rawContent: null,
      position: 1024,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });
});

describe("toJobPostingUpdate", () => {
  it("undefined 필드는 payload에서 제외한다", () => {
    expect(toJobPostingUpdate({ status: "interview" })).toEqual({
      status: "interview",
    });
  });

  it("null은 의도적인 값이므로 유지한다", () => {
    expect(toJobPostingUpdate({ deadline: null })).toEqual({ deadline: null });
  });
});

describe("jobPostingInputSchema", () => {
  it("최소 필드만 주면 기본값을 채운다", () => {
    expect(
      jobPostingInputSchema.parse({ company: "토스", title: "FE 개발자" }),
    ).toEqual({
      url: null,
      company: "토스",
      title: "FE 개발자",
      deadline: null,
      requiredSkills: [],
      status: "interested",
      source: "manual",
      rawContent: null,
    });
  });

  it("잘못된 마감일 형식을 거부한다", () => {
    const result = jobPostingInputSchema.safeParse({
      company: "토스",
      title: "FE 개발자",
      deadline: "2026/09/30",
    });
    expect(result.success).toBe(false);
  });
});

describe("jobPostingUpdateSchema", () => {
  // 생성용 스키마를 그대로 partial()하면 기본값이 남아, 한 필드만 PATCH 해도
  // 나머지가 기본값으로 덮어써진다. 그 회귀를 막는 테스트다.
  it("보내지 않은 필드에 기본값을 채우지 않는다", () => {
    expect(jobPostingUpdateSchema.parse({ status: "interview" })).toEqual({
      status: "interview",
    });
  });

  // DB에서 읽은 updated_at을 그대로 되돌려보내는 것이 낙관적 잠금의 전제라서,
  // Postgres timestamptz의 오프셋 표기를 반드시 통과시켜야 한다.
  it("timestamptz 오프셋 표기의 expectedUpdatedAt을 허용한다", () => {
    const result = jobPostingUpdateSchema.safeParse({
      status: "interview",
      expectedUpdatedAt: "2026-08-23T06:00:00.123456+00:00",
    });
    expect(result.success).toBe(true);
  });

  it("Z로 끝나는 expectedUpdatedAt도 허용한다", () => {
    const result = jobPostingUpdateSchema.safeParse({
      expectedUpdatedAt: "2026-08-23T06:00:00.123Z",
    });
    expect(result.success).toBe(true);
  });

  it("날짜만 있는 expectedUpdatedAt은 거부한다", () => {
    const result = jobPostingUpdateSchema.safeParse({
      expectedUpdatedAt: "2026-08-23",
    });
    expect(result.success).toBe(false);
  });
});
