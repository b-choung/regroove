import { describe, expect, it } from "vitest";
import type { JobPosting, JobStatus } from "@/types/job-posting";
import { computeDashboardStats } from "./stats";

/** KST로 2026-08-25 12:00. 기준 날짜를 고정해 D-day 경계를 테스트한다. */
const NOW = Date.parse("2026-08-25T03:00:00Z");

let seq = 0;

function jobPosting(overrides: Partial<JobPosting> = {}): JobPosting {
  seq += 1;

  return {
    id: `${seq}`,
    userId: "22222222-2222-2222-2222-222222222222",
    url: null,
    company: "회사",
    title: `공고 ${seq}`,
    deadline: null,
    requiredSkills: [],
    status: "interested",
    source: "manual",
    rawContent: null,
    position: 1024,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function withStatuses(...statuses: JobStatus[]): JobPosting[] {
  return statuses.map((status) => jobPosting({ status }));
}

describe("computeDashboardStats", () => {
  it("상태별 개수를 세고 결과 확정 공고는 진행 중에서 뺀다", () => {
    const stats = computeDashboardStats(
      withStatuses("interested", "interested", "interview", "result"),
      NOW,
    );

    expect(stats.total).toBe(4);
    expect(stats.active).toBe(3);
    expect(stats.byStatus.interested).toBe(2);
    expect(stats.byStatus.applying).toBe(0);
  });

  // 단계는 누적이다. 면접까지 간 공고는 "지원 완료"도 통과했으므로 분모에 들어간다.
  it("단계별 개수를 누적으로 세고 전환율을 낸다", () => {
    const stats = computeDashboardStats(
      withStatuses("applied", "applied", "document_passed", "interview"),
      NOW,
    );

    expect(stats.funnel.applied).toBe(4);
    expect(stats.funnel.documentPassed).toBe(2);
    expect(stats.funnel.interview).toBe(1);
    expect(stats.funnel.documentPassRate).toBe(0.5);
    expect(stats.funnel.interviewRate).toBe(0.5);
  });

  // 서류에서 떨어진 공고와 최종에서 떨어진 공고가 같은 result에 들어가 있어,
  // 비율에 섞으면 실제와 다른 숫자가 나온다.
  it("결과 확정 공고는 전환율에서 빼고 제외 건수를 알려준다", () => {
    const stats = computeDashboardStats(
      withStatuses("applied", "interview", "result", "result"),
      NOW,
    );

    expect(stats.funnel.applied).toBe(2);
    expect(stats.funnel.documentPassRate).toBe(0.5);
    expect(stats.funnel.excludedResults).toBe(2);
  });

  it("아직 지원한 공고가 없으면 0%가 아니라 계산 불가다", () => {
    const stats = computeDashboardStats(withStatuses("interested"), NOW);

    expect(stats.funnel.documentPassRate).toBeNull();
    expect(stats.funnel.interviewRate).toBeNull();
  });

  it("마감 지난 공고와 임박한 공고를 마감일 순으로 나눈다", () => {
    const stats = computeDashboardStats(
      [
        jobPosting({ deadline: "2026-09-01" }), // D-7: 경계 포함
        jobPosting({ deadline: "2026-09-02" }), // D-8: 아직 여유
        jobPosting({ deadline: "2026-08-25" }), // 오늘 마감
        jobPosting({ deadline: "2026-08-20" }),
        jobPosting({ deadline: "2026-08-23" }),
      ],
      NOW,
    );

    expect(stats.overdue.map((item) => item.deadline)).toEqual([
      "2026-08-20",
      "2026-08-23",
    ]);
    expect(stats.dueSoon.map((item) => item.deadline)).toEqual([
      "2026-08-25",
      "2026-09-01",
    ]);
  });

  it("결과가 나온 공고의 마감일은 알리지 않는다", () => {
    const stats = computeDashboardStats(
      [jobPosting({ deadline: "2026-08-20", status: "result" })],
      NOW,
    );

    expect(stats.overdue).toEqual([]);
  });

  it("최근 7일 안에 등록한 공고만 센다", () => {
    const stats = computeDashboardStats(
      [
        jobPosting({ createdAt: "2026-08-24T00:00:00.000Z" }),
        jobPosting({ createdAt: "2026-08-17T00:00:00.000Z" }),
      ],
      NOW,
    );

    expect(stats.addedRecently).toBe(1);
  });
});
