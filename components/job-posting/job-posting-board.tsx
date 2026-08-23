"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";
import { CreateJobPostingDialog } from "@/components/job-posting/create-job-posting-dialog";
import { EditJobPostingDialog } from "@/components/job-posting/edit-job-posting-dialog";
import { JobPostingCard } from "@/components/job-posting/job-posting-card";
import { KanbanColumn } from "@/components/job-posting/kanban-column";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobPostings, useMoveJobPosting } from "@/hooks/use-job-postings";
import {
  createAnnouncements,
  screenReaderInstructions,
} from "@/lib/job-postings/dnd-accessibility";
import { groupByStatus } from "@/lib/job-postings/group";
import { planMove, reorderForDrop } from "@/lib/job-postings/position";
import { useUiStore } from "@/stores/ui-store";
import {
  KANBAN_COLUMNS,
  type JobPosting,
  type JobStatus,
} from "@/types/job-posting";

/**
 * 상태별 컬럼 보드 + 드래그앤드롭.
 *
 * 드래그 중에는 미리보기를 DragOverlay로만 그리고, 카드의 실제 이동은 드롭 시점에
 * 한 번 계산한다. onDragOver마다 컬럼 사이로 카드를 옮겨 두는 방식은 로컬 미러
 * 상태가 필요해 서버 상태(TanStack Query)와 두 갈래로 갈라지기 때문이다.
 */
export function JobPostingBoard() {
  const { data, isPending, isError, error, refetch } = useJobPostings();
  const move = useMoveJobPosting();
  const openCreateDialog = useUiStore((state) => state.openCreateDialog);
  const selectedId = useUiStore((state) => state.selectedJobPostingId);
  const draggingId = useUiStore((state) => state.draggingJobPostingId);
  const setDragging = useUiStore((state) => state.setDraggingJobPosting);

  const sensors = useSensors(
    // 8px 이동 전에는 드래그로 보지 않는다. 카드 안의 버튼·Select 클릭을 살리는 값.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // data가 없을 때마다 새 배열을 만들면 아래 useMemo가 매 렌더 무효화된다.
  const jobPostings = useMemo(() => data ?? [], [data]);
  const announcements = useMemo(
    () => createAnnouncements(jobPostings),
    [jobPostings],
  );

  function handleDragStart(event: DragStartEvent) {
    setDragging(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);

    const { active, over } = event;
    if (!over || over.id === active.id) return;

    const activeCard = jobPostings.find((item) => item.id === active.id);
    const targetStatus = statusOf(over.data.current);
    if (!activeCard || !targetStatus) return;

    const grouped = groupByStatus(jobPostings);
    const orderedColumn = reorderForDrop({
      column: grouped[targetStatus],
      active: activeCard,
      // 컬럼의 빈 영역에 놓으면 over.id가 카드가 아니라 컬럼(상태)이다.
      overId: over.data.current?.type === "card" ? String(over.id) : null,
    });

    const plan = planMove({
      orderedColumn,
      activeId: activeCard.id,
      status: targetStatus,
    });
    if (!plan) return;

    const isNoop =
      !plan.rebalanced &&
      targetStatus === activeCard.status &&
      plan.updates[0]?.position === activeCard.position;
    if (isNoop) return;

    move.mutate({
      activeId: activeCard.id,
      plan,
      expectedUpdatedAt: activeCard.updatedAt,
    });
  }

  if (isPending) return <BoardSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8">
        <p className="text-sm text-muted-foreground">
          공고를 불러오지 못했습니다. {error.message}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const grouped = groupByStatus(jobPostings);
  const selected: JobPosting | null =
    jobPostings.find((jobPosting) => jobPosting.id === selectedId) ?? null;
  const dragging: JobPosting | null =
    jobPostings.find((jobPosting) => jobPosting.id === draggingId) ?? null;

  return (
    <>
      {jobPostings.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8">
          <p className="text-sm text-muted-foreground">
            아직 등록한 공고가 없습니다.
          </p>
          <Button size="sm" onClick={openCreateDialog}>
            <PlusIcon />첫 공고 추가하기
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="grid flex-1 grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              jobPostings={grouped[column.status]}
            />
          ))}
        </div>

        <DragOverlay>
          {dragging && (
            <JobPostingCard
              jobPosting={dragging}
              className="rotate-1 shadow-lg"
            />
          )}
        </DragOverlay>
      </DndContext>

      <CreateJobPostingDialog />
      <EditJobPostingDialog jobPosting={selected} />
    </>
  );
}

/** 드롭 대상(카드/컬럼)에 심어 둔 status를 읽는다. */
function statusOf(data: Record<string, unknown> | undefined): JobStatus | null {
  const status = data?.status;
  return typeof status === "string" ? (status as JobStatus) : null;
}

function BoardSkeleton() {
  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUMNS.map((column) => (
        <div
          key={column.status}
          className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
        >
          <h2 className="text-sm font-medium">{column.label}</h2>
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}
