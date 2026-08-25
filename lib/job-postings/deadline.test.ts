import { describe, expect, it } from "vitest";
import {
  daysUntil,
  deadlineLabel,
  deadlineTone,
  todayInSeoul,
} from "./deadline";

describe("todayInSeoul", () => {
  // UTC 자정 기준으로 "오늘"을 정하면 한국의 오전 9시 전까지 하루가 밀린다.
  it("UTC 날짜가 아니라 한국 날짜를 돌려준다", () => {
    expect(todayInSeoul(Date.parse("2026-08-24T15:30:00Z"))).toBe("2026-08-25");
    expect(todayInSeoul(Date.parse("2026-08-24T14:30:00Z"))).toBe("2026-08-24");
  });
});

describe("daysUntil", () => {
  it("오늘 마감은 0, 지난 마감은 음수다", () => {
    expect(daysUntil("2026-08-25", "2026-08-25")).toBe(0);
    expect(daysUntil("2026-08-28", "2026-08-25")).toBe(3);
    expect(daysUntil("2026-08-22", "2026-08-25")).toBe(-3);
  });

  it("달과 해가 바뀌어도 일수로 센다", () => {
    expect(daysUntil("2026-09-01", "2026-08-30")).toBe(2);
    expect(daysUntil("2027-01-01", "2026-12-30")).toBe(2);
  });

  it("날짜 형식이 아니면 null이다", () => {
    expect(daysUntil("2026-08", "2026-08-25")).toBeNull();
  });
});

describe("deadlineTone", () => {
  it("경계일(D-7)까지 임박으로 본다", () => {
    expect(deadlineTone("2026-09-01", "2026-08-25")).toBe("due-soon");
    expect(deadlineTone("2026-09-02", "2026-08-25")).toBe("normal");
    expect(deadlineTone("2026-08-24", "2026-08-25")).toBe("overdue");
  });

  it("마감일이 없으면 강조하지 않는다", () => {
    expect(deadlineTone(null, "2026-08-25")).toBe("normal");
  });
});

describe("deadlineLabel", () => {
  it("남은 일수를 사람이 읽는 문구로 만든다", () => {
    expect(deadlineLabel("2026-08-25", "2026-08-25")).toBe("오늘 마감");
    expect(deadlineLabel("2026-08-28", "2026-08-25")).toBe("D-3");
    expect(deadlineLabel("2026-08-22", "2026-08-25")).toBe("3일 지남");
  });
});
