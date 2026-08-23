import { describe, expect, it } from "vitest";
import {
  MIN_POSITION_GAP,
  POSITION_STEP,
  planMove,
  positionBetween,
  reorderForDrop,
} from "./position";

const card = (id: string, position: number) => ({ id, position });

describe("positionBetween", () => {
  it("두 카드 사이면 중간값을 쓴다", () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it("맨 위로 옮기면 첫 카드보다 한 칸 앞", () => {
    expect(positionBetween(null, 1024)).toBe(0);
  });

  it("맨 아래로 옮기면 마지막 카드보다 한 칸 뒤", () => {
    expect(positionBetween(2048, null)).toBe(2048 + POSITION_STEP);
  });

  it("빈 컬럼이면 기본 간격", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
  });
});

describe("reorderForDrop", () => {
  const column = [card("a", 1024), card("b", 2048), card("c", 3072)];

  it("같은 컬럼에서 아래로 끌면 대상 카드 뒤에 놓는다", () => {
    const result = reorderForDrop({
      column,
      active: card("a", 1024),
      overId: "c",
    });

    expect(result.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("같은 컬럼에서 위로 끌면 대상 카드 앞에 놓는다", () => {
    const result = reorderForDrop({
      column,
      active: card("c", 3072),
      overId: "a",
    });

    expect(result.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("다른 컬럼에서 온 카드는 대상 카드 앞에 끼운다", () => {
    const result = reorderForDrop({
      column,
      active: card("new", 512),
      overId: "b",
    });

    expect(result.map((item) => item.id)).toEqual(["a", "new", "b", "c"]);
  });

  it("빈 영역에 놓으면 다른 컬럼에서 온 카드만 맨 아래로 붙는다", () => {
    expect(
      reorderForDrop({ column, active: card("new", 1), overId: null }).map(
        (item) => item.id,
      ),
    ).toEqual(["a", "b", "c", "new"]);

    // 같은 컬럼 카드라면 순서를 바꾸지 않는다.
    expect(
      reorderForDrop({ column, active: card("a", 1024), overId: null }).map(
        (item) => item.id,
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("빈 컬럼으로 옮기면 카드 하나만 남는다", () => {
    const result = reorderForDrop({
      column: [],
      active: card("a", 1024),
      overId: null,
    });

    expect(result.map((item) => item.id)).toEqual(["a"]);
  });
});

describe("planMove", () => {
  it("이동한 카드 하나만 갱신한다", () => {
    const plan = planMove({
      orderedColumn: [card("a", 1024), card("moved", 9999), card("b", 2048)],
      activeId: "moved",
      status: "applied",
    });

    expect(plan).toEqual({
      status: "applied",
      updates: [{ id: "moved", position: 1536 }],
      rebalanced: false,
    });
  });

  it("컬럼에 없는 카드면 계획을 세우지 않는다", () => {
    expect(
      planMove({
        orderedColumn: [card("a", 1024)],
        activeId: "ghost",
        status: "applied",
      }),
    ).toBeNull();
  });

  // 같은 두 카드 사이에 반복해서 끼워 넣으면 간격이 반씩 줄어 double 정밀도가
  // 바닥난다. 그때는 카드 한 장만 옮기는 대신 컬럼 전체 번호를 다시 매긴다.
  it("이웃 간격이 정밀도 한계에 닿으면 컬럼 전체를 다시 번호 매긴다", () => {
    const plan = planMove({
      orderedColumn: [
        card("a", 1024),
        card("moved", 9999),
        card("b", 1024 + MIN_POSITION_GAP / 2),
      ],
      activeId: "moved",
      status: "interested",
    });

    expect(plan).toEqual({
      status: "interested",
      updates: [
        { id: "a", position: 1024 },
        { id: "moved", position: 2048 },
        { id: "b", position: 3072 },
      ],
      rebalanced: true,
    });
  });

  it("반복해서 끼워 넣어도 순서가 무너지지 않는다", () => {
    let column = [card("top", 1024), card("bottom", 2048)];

    for (let index = 0; index < 80; index += 1) {
      const plan = planMove({
        orderedColumn: [column[0], card(`x${index}`, 0), column[1]],
        activeId: `x${index}`,
        status: "interested",
      });

      // 재정렬이 일어나면 컬럼 전체가 갱신되므로 간격이 다시 벌어진다.
      const positions = new Map(
        plan!.updates.map((update) => [update.id, update.position]),
      );
      const inserted = positions.get(`x${index}`)!;
      const top = positions.get("top") ?? column[0].position;
      const bottom = positions.get("bottom") ?? column[1].position;

      expect(top).toBeLessThan(inserted);
      expect(inserted).toBeLessThan(bottom);

      column = [card("top", top), card("bottom", inserted)];
    }
  });
});
