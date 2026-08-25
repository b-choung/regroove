import {
  DUE_SOON_DAYS,
  daysUntil,
  todayInSeoul,
} from "@/lib/job-postings/deadline";
import {
  JOB_STATUSES,
  type JobPosting,
  type JobStatus,
} from "@/types/job-posting";

/**
 * 대시보드 통계.
 *
 * 지원 이력 테이블 없이 공고의 "현재 상태"만으로 계산한다. 그래서 단계별 전환율은
 * `result`(결과 확정) 공고를 빼고 낸다. 서류에서 떨어진 공고와 최종 면접까지 가서
 * 떨어진 공고가 같은 `result`에 들어가 있어, 어느 단계까지 갔는지 알 수 없기
 * 때문이다. 억지로 섞으면 통과율이 실제보다 낮게(또는 높게) 보이는 숫자가 되므로,
 * 제외한 건수(`excludedResults`)를 함께 돌려주고 화면에도 표시한다.
 */

/** 최근 추가 공고를 셀 기간. */
export const RECENT_DAYS = 7;

/** 결과가 확정되지 않아 아직 손이 가는 상태들. */
const ACTIVE_STATUSES = JOB_STATUSES.filter(
  (status) => status !== "result",
) as readonly JobStatus[];

export interface FunnelStats {
  /** 지원 완료 이상까지 간 공고 수 (결과 확정 제외) */
  applied: number;
  /** 서류 합격 이상 */
  documentPassed: number;
  /** 면접 이상 */
  interview: number;
  /** 서류 통과율. 분모가 0이면 null(= 계산 불가) */
  documentPassRate: number | null;
  /** 서류 합격 → 면접 전환율 */
  interviewRate: number | null;
  /** 어느 단계에서 끝났는지 알 수 없어 비율 계산에서 뺀 공고 수 */
  excludedResults: number;
}

export interface DashboardStats {
  /** 계산 기준 날짜(KST). 마감 D-day 표시에 그대로 쓴다. */
  today: string;
  total: number;
  /** 결과가 나오지 않은 진행 중 공고 수 */
  active: number;
  addedRecently: number;
  byStatus: Record<JobStatus, number>;
  funnel: FunnelStats;
  /** 마감일이 지났는데 아직 진행 중인 공고 (오래 지난 순) */
  overdue: JobPosting[];
  /** 오늘부터 DUE_SOON_DAYS 안에 마감하는 진행 중 공고 (임박한 순) */
  dueSoon: JobPosting[];
}

export function computeDashboardStats(
  jobPostings: JobPosting[],
  nowMs: number = Date.now(),
): DashboardStats {
  const today = todayInSeoul(nowMs);
  const recentSince = nowMs - RECENT_DAYS * 86_400_000;

  const byStatus = Object.fromEntries(
    JOB_STATUSES.map((status) => [status, 0]),
  ) as Record<JobStatus, number>;

  let addedRecently = 0;
  const overdue: JobPosting[] = [];
  const dueSoon: JobPosting[] = [];

  for (const jobPosting of jobPostings) {
    byStatus[jobPosting.status] += 1;

    if (Date.parse(jobPosting.createdAt) >= recentSince) addedRecently += 1;

    // 결과가 나온 공고의 마감일은 더 이상 알림거리가 아니다.
    if (!jobPosting.deadline || jobPosting.status === "result") continue;

    const days = daysUntil(jobPosting.deadline, today);
    if (days === null) continue;
    if (days < 0) overdue.push(jobPosting);
    else if (days <= DUE_SOON_DAYS) dueSoon.push(jobPosting);
  }

  return {
    today,
    total: jobPostings.length,
    active: ACTIVE_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    addedRecently,
    byStatus,
    funnel: toFunnel(byStatus),
    overdue: overdue.sort(byDeadlineAsc),
    dueSoon: dueSoon.sort(byDeadlineAsc),
  };
}

function toFunnel(byStatus: Record<JobStatus, number>): FunnelStats {
  const interview = byStatus.interview;
  const documentPassed = byStatus.document_passed + interview;
  const applied = byStatus.applied + documentPassed;

  return {
    applied,
    documentPassed,
    interview,
    documentPassRate: rate(documentPassed, applied),
    interviewRate: rate(interview, documentPassed),
    excludedResults: byStatus.result,
  };
}

/** 분모가 0이면 0%가 아니라 "계산 불가"다. 0%로 표시하면 실패한 것처럼 읽힌다. */
function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/** 마감일 있는 공고끼리만 비교한다. (호출 전에 null을 걸러 둔다) */
function byDeadlineAsc(a: JobPosting, b: JobPosting): number {
  return (a.deadline ?? "").localeCompare(b.deadline ?? "");
}
