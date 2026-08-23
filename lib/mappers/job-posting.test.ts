import { describe, expect, it } from "vitest";
import type { JobPostingRow } from "@/types/database";
import { jobPostingInputSchema } from "@/types/job-posting";
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
