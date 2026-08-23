import type { JobPosting, JobStatus } from "@/types/job-posting";

/**
 * 칸반 카드 위치 계산.
 *
 * position은 double precision이라, 카드를 옮길 때 이웃 두 장의 중간값을 넣으면
 * 카드 한 장만 UPDATE 하면 된다. 컬럼 전체 순서를 다시 쓰지 않으므로 낙관적
 * 업데이트의 롤백 범위도 카드 한 장으로 좁아진다.
 */

/** 컬럼 끝에 카드를 붙일 때 쓰는 간격. 서버 신규 생성 간격과 같은 값. */
export const POSITION_STEP = 1024;

/**
 * 같은 두 카드 사이에 계속 끼워 넣으면 간격이 반씩 줄어 double 정밀도가 바닥난다.
 * (1024에서 시작해도 50번쯤 반복하면 두 위치가 같은 값이 되어 순서가 무너진다.)
 * 간격이 이 값보다 좁아지면 컬럼 전체에 번호를 다시 매긴다.
 */
export const MIN_POSITION_GAP = 1e-6;

type Positioned = Pick<JobPosting, "id" | "position">;

export interface PositionUpdate {
  id: string;
  position: number;
}

export interface MovePlan {
  status: JobStatus;
  /** 서버에 보낼 갱신 목록. 보통 이동한 카드 1개, 재정렬이 필요하면 컬럼 전체. */
  updates: PositionUpdate[];
  /** 정밀도 한계로 컬럼 전체 번호를 다시 매겼는지 여부 */
  rebalanced: boolean;
}

/** 이웃 두 카드 사이에 끼워 넣을 위치. 이웃이 없는 쪽은 한 칸(STEP) 밖으로 나간다. */
export function positionBetween(
  before: number | null,
  after: number | null,
): number {
  if (before === null && after === null) return POSITION_STEP;
  if (before === null) return after! - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  return (before + after) / 2;
}

/**
 * 드롭 지점을 반영한 목표 컬럼의 카드 순서를 만든다.
 *
 * 같은 컬럼에서 아래로 끌면 대상 카드 뒤, 그 외에는 대상 카드 앞에 끼운다.
 * (dnd-kit의 arrayMove와 같은 감각을 컬럼 간 이동까지 확장한 것)
 */
export function reorderForDrop({
  column,
  active,
  overId,
}: {
  /** 목표 컬럼의 현재 카드 순서 */
  column: Positioned[];
  active: Positioned;
  /** 드롭 지점의 카드 id. 컬럼 빈 영역에 놓으면 null */
  overId: string | null;
}): Positioned[] {
  const withoutActive = column.filter((card) => card.id !== active.id);
  const wasInColumn = withoutActive.length !== column.length;
  const overIndex =
    overId === null
      ? -1
      : withoutActive.findIndex((card) => card.id === overId);

  // 카드가 아닌 컬럼 빈 영역에 놓았다면, 다른 컬럼에서 온 경우에만 맨 아래로 붙인다.
  if (overIndex === -1) {
    return wasInColumn ? column : [...withoutActive, active];
  }

  const activeIndex = column.findIndex((card) => card.id === active.id);
  const overIndexInColumn = column.findIndex((card) => card.id === overId);
  const insertAt =
    wasInColumn && activeIndex < overIndexInColumn ? overIndex + 1 : overIndex;

  return [
    ...withoutActive.slice(0, insertAt),
    active,
    ...withoutActive.slice(insertAt),
  ];
}

/**
 * 정렬된 컬럼에서 이동한 카드의 새 position을 계산한다.
 * 이웃 간격이 정밀도 한계에 가까우면 컬럼 전체를 STEP 간격으로 다시 번호 매긴다.
 */
export function planMove({
  orderedColumn,
  activeId,
  status,
}: {
  /** 이동이 끝난 뒤의 컬럼 순서 (이동한 카드 포함) */
  orderedColumn: Positioned[];
  activeId: string;
  status: JobStatus;
}): MovePlan | null {
  const index = orderedColumn.findIndex((card) => card.id === activeId);
  if (index === -1) return null;

  const before = index > 0 ? orderedColumn[index - 1].position : null;
  const after =
    index < orderedColumn.length - 1 ? orderedColumn[index + 1].position : null;

  if (needsRebalance(before, after)) {
    return {
      status,
      updates: orderedColumn.map((card, order) => ({
        id: card.id,
        position: (order + 1) * POSITION_STEP,
      })),
      rebalanced: true,
    };
  }

  return {
    status,
    updates: [{ id: activeId, position: positionBetween(before, after) }],
    rebalanced: false,
  };
}

/**
 * 이동 계획을 목록에 그대로 반영한다. (낙관적 업데이트에서 캐시를 먼저 고칠 때 사용)
 * 순서 정렬은 화면 직전 groupByStatus가 담당하므로 배열 순서는 건드리지 않는다.
 */
export function applyMovePlan(
  jobPostings: JobPosting[],
  activeId: string,
  plan: MovePlan,
): JobPosting[] {
  const positions = new Map(
    plan.updates.map((update) => [update.id, update.position]),
  );

  return jobPostings.map((jobPosting) => {
    const position = positions.get(jobPosting.id);
    if (position === undefined) return jobPosting;

    return {
      ...jobPosting,
      position,
      status: jobPosting.id === activeId ? plan.status : jobPosting.status,
    };
  });
}

function needsRebalance(before: number | null, after: number | null): boolean {
  if (before === null || after === null) return false;
  // 간격이 없거나(정밀도 소진) 역전된 데이터면 다시 번호를 매기는 쪽이 안전하다.
  return after - before < MIN_POSITION_GAP;
}
