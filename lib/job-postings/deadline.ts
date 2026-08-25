/**
 * 마감일 계산.
 *
 * 마감일은 시각이 없는 날짜(YYYY-MM-DD)라서, 남은 일수를 브라우저 로컬 시간으로
 * 재면 사용자의 타임존에 따라 D-1과 D-0이 갈린다. 기준 날짜를 문자열로 받아
 * 순수 함수로 두고, "오늘"을 정하는 책임만 `todayInSeoul()`에 모았다.
 */

/** 마감 임박으로 볼 기준. */
export const DUE_SOON_DAYS = 7;

export type DeadlineTone = "overdue" | "due-soon" | "normal";

/** 한국 기준 오늘 날짜(YYYY-MM-DD). 국내 채용 공고의 마감은 KST 기준이다. */
export function todayInSeoul(nowMs: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 오늘부터 마감일까지 남은 일수. 오늘 마감이면 0, 지났으면 음수. */
export function daysUntil(deadline: string, today: string): number | null {
  const from = toUtcMs(today);
  const to = toUtcMs(deadline);
  if (from === null || to === null) return null;

  return Math.round((to - from) / 86_400_000);
}

export function deadlineTone(
  deadline: string | null,
  today: string,
): DeadlineTone {
  if (!deadline) return "normal";

  const days = daysUntil(deadline, today);
  if (days === null) return "normal";
  if (days < 0) return "overdue";

  return days <= DUE_SOON_DAYS ? "due-soon" : "normal";
}

/** "D-3" / "오늘 마감" / "3일 지남" 같은 짧은 표시용 문구. */
export function deadlineLabel(deadline: string, today: string): string {
  const days = daysUntil(deadline, today);
  if (days === null) return deadline;
  if (days === 0) return "오늘 마감";
  if (days < 0) return `${-days}일 지남`;

  return `D-${days}`;
}

/**
 * YYYY-MM-DD를 UTC 자정 밀리초로. 날짜끼리만 비교하므로 타임존을 UTC로 고정한다.
 * (로컬 타임존으로 파싱하면 DST가 있는 지역에서 하루가 23·25시간이 되어 어긋난다)
 */
function toUtcMs(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
