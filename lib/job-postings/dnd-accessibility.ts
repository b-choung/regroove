import type {
  Announcements,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  JOB_STATUS_LABELS,
  type JobPosting,
  type JobStatus,
} from "@/types/job-posting";

/**
 * dnd-kit 기본 안내 문구는 영어이고 "Draggable item 3"처럼 식별자를 읽어준다.
 * 스크린리더/키보드 사용자에게 "관심 컬럼으로 옮겼습니다"처럼 들리도록 교체한다.
 */

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "스페이스나 엔터로 카드를 집습니다. 방향키로 옮기고, 다시 스페이스나 엔터를 누르면 놓습니다. Esc로 취소합니다.",
};

/** 드롭 지점(카드 또는 컬럼)이 속한 컬럼 라벨을 찾는다. */
function columnLabel(
  overId: UniqueIdentifier | undefined,
  jobPostings: JobPosting[],
): string | null {
  if (overId === undefined) return null;

  const id = String(overId);
  if (id in JOB_STATUS_LABELS) return JOB_STATUS_LABELS[id as JobStatus];

  const card = jobPostings.find((jobPosting) => jobPosting.id === id);
  return card ? JOB_STATUS_LABELS[card.status] : null;
}

export function createAnnouncements(jobPostings: JobPosting[]): Announcements {
  const title = (id: UniqueIdentifier) =>
    jobPostings.find((jobPosting) => jobPosting.id === String(id))?.title ??
    "카드";

  return {
    onDragStart: ({ active }) => `${title(active.id)} 카드를 집었습니다.`,
    onDragOver: ({ active, over }) => {
      const label = columnLabel(over?.id, jobPostings);
      return label
        ? `${title(active.id)} 카드가 ${label} 컬럼 위에 있습니다.`
        : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const label = columnLabel(over?.id, jobPostings);
      return label
        ? `${title(active.id)} 카드를 ${label} 컬럼에 놓았습니다.`
        : `${title(active.id)} 카드를 제자리에 놓았습니다.`;
    },
    onDragCancel: ({ active }) =>
      `${title(active.id)} 카드 옮기기를 취소했습니다.`,
  };
}
