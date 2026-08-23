import { create } from "zustand";

/**
 * UI 로컬 상태 전용 스토어.
 * 서버 데이터(공고 목록 등)는 절대 여기에 두지 않는다 — TanStack Query 담당.
 */
interface UiState {
  /** 공고 추가 모달 열림 여부 */
  isCreateDialogOpen: boolean;
  /** 상세 시트에 열려 있는 공고 id (없으면 null) */
  selectedJobPostingId: string | null;
  /** 드래그 중인 카드 id. DragOverlay 렌더링에 사용한다. */
  draggingJobPostingId: string | null;

  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  selectJobPosting: (id: string | null) => void;
  setDraggingJobPosting: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCreateDialogOpen: false,
  selectedJobPostingId: null,
  draggingJobPostingId: null,

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  selectJobPosting: (id) => set({ selectedJobPostingId: id }),
  setDraggingJobPosting: (id) => set({ draggingJobPostingId: id }),
}));
