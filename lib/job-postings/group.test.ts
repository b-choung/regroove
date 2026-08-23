import { describe, expect, it } from "vitest";
import type { JobPosting } from "@/types/job-posting";
import { groupByStatus } from "./group";

function jobPosting(
  overrides: Partial<JobPosting> & { id: string },
): JobPosting {
  return {
    userId: "22222222-2222-2222-2222-222222222222",
    url: null,
    company: "회사",
    title: "공고",
    deadline: null,
    requiredSkills: [],
    status: "interested",
    source: "manual",
    rawContent: null,
    position: 1024,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupByStatus", () => {
  it("모든 상태 키를 빈 배열로라도 채운다", () => {
    const grouped = groupByStatus([]);

    expect(Object.keys(grouped)).toEqual([
      "interested",
      "applying",
      "applied",
      "document_passed",
      "interview",
      "result",
    ]);
    expect(grouped.interested).toEqual([]);
  });

  it("상태별로 나눈다", () => {
    const grouped = groupByStatus([
      jobPosting({ id: "a", status: "interested" }),
      jobPosting({ id: "b", status: "interview" }),
    ]);

    expect(grouped.interested.map((item) => item.id)).toEqual(["a"]);
    expect(grouped.interview.map((item) => item.id)).toEqual(["b"]);
  });

  it("컬럼 안에서 position 오름차순으로 정렬한다", () => {
    const grouped = groupByStatus([
      jobPosting({ id: "c", position: 3072 }),
      jobPosting({ id: "a", position: 1024 }),
      jobPosting({ id: "b", position: 2048 }),
    ]);

    expect(grouped.interested.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("position이 같으면 생성 시각 순으로 갈라 렌더 순서를 고정한다", () => {
    const grouped = groupByStatus([
      jobPosting({
        id: "later",
        position: 1024,
        createdAt: "2026-08-02T00:00:00.000Z",
      }),
      jobPosting({
        id: "earlier",
        position: 1024,
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    ]);

    expect(grouped.interested.map((item) => item.id)).toEqual([
      "earlier",
      "later",
    ]);
  });
});
