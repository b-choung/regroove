import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui-store";
import type { JobPosting } from "@/types/job-posting";
import { AddJobPostingButton } from "./add-job-posting-button";
import { BoardDialogs } from "./board-dialogs";
import { JobPostingBoard } from "./job-posting-board";

const jobPostings: JobPosting[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "99999999-9999-9999-9999-999999999999",
    url: "https://www.wanted.co.kr/wd/12345",
    company: "토스",
    title: "프론트엔드 개발자",
    deadline: "2026-09-30",
    requiredSkills: ["TypeScript", "React"],
    status: "interested",
    source: "wanted",
    rawContent: null,
    position: 1024,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    userId: "99999999-9999-9999-9999-999999999999",
    url: null,
    company: "카카오",
    title: "웹 프론트엔드",
    deadline: null,
    requiredSkills: [],
    status: "interview",
    source: "saramin",
    rawContent: null,
    position: 1024,
    createdAt: "2026-08-02T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
  },
];

const notes = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    jobPostingId: "11111111-1111-1111-1111-111111111111",
    content: "1차 면접 9/15 14:00",
    createdAt: "2026-08-03T00:00:00.000Z",
  },
];

/** 실제 페이지와 같은 구성으로 렌더한다. (헤더 버튼 + 보드 + 모달) */
function renderBoard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AddJobPostingButton />
      <JobPostingBoard />
      <BoardDialogs />
    </QueryClientProvider>,
  );

  return userEvent.setup();
}

beforeEach(() => {
  useUiStore.setState({
    isCreateDialogOpen: false,
    selectedJobPostingId: null,
    draggingJobPostingId: null,
  });

  stubApi();
});

/** 보드는 공고 목록·스킬 프로필을, 상세 다이얼로그는 메모를 각각 요청한다. */
function stubApi({ skills = [] as string[] } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/notes")) return Response.json({ notes });
      if (path.includes("/api/skill-profile")) {
        return Response.json({
          skillProfile: skills.length
            ? { userId: "u", skills, experienceYears: 3 }
            : null,
        });
      }
      return Response.json({ jobPostings });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("JobPostingBoard", () => {
  it("공고를 상태별 컬럼에 나눠 렌더링한다", async () => {
    renderBoard();

    const interested = await screen.findByRole("region", { name: /관심/ });
    const interview = screen.getByRole("region", { name: /면접/ });

    expect(interested).toHaveTextContent("프론트엔드 개발자");
    expect(interested).toHaveTextContent("토스");
    expect(interview).toHaveTextContent("웹 프론트엔드");
    expect(interested).not.toHaveTextContent("웹 프론트엔드");
  });

  it("카드마다 드래그 손잡이를 제공한다", async () => {
    renderBoard();

    expect(
      await screen.findByRole("button", {
        name: "프론트엔드 개발자 카드 옮기기",
      }),
    ).toBeInTheDocument();
  });

  it("스킬 프로필이 있으면 카드에 매칭률을 보여준다", async () => {
    // 공고 요구 스택은 TypeScript·React, 내 스택은 표기가 다른 typescript 하나.
    stubApi({ skills: ["typescript"] });
    renderBoard();

    expect(await screen.findByText("스킬 50%")).toBeInTheDocument();
  });

  // 프로필이 없을 때 모든 카드에 0%가 붙으면 정보가 아니라 잡음이다.
  it("스킬 프로필이 없으면 매칭률을 그리지 않는다", async () => {
    renderBoard();

    await screen.findByRole("region", { name: /관심/ });
    expect(screen.queryByText(/스킬 \d+%/)).not.toBeInTheDocument();
  });

  it("빈 컬럼에도 드롭 안내를 남긴다", async () => {
    renderBoard();

    const applied = await screen.findByRole("region", { name: /지원 완료/ });
    expect(applied).toHaveTextContent("여기로 카드를 옮겨 보세요");
  });

  it("카드를 누르면 그 공고의 수정 다이얼로그가 열린다", async () => {
    const user = renderBoard();

    // 카드 본문 버튼과 드래그 손잡이가 둘 다 카드 제목을 이름에 담고 있어
    // 정확한 이름으로 구분한다.
    await user.click(
      await screen.findByRole("button", { name: "토스 프론트엔드 개발자" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("공고 상세");
    expect(dialog).toHaveTextContent("토스 · 프론트엔드 개발자");
    await waitFor(() =>
      expect(screen.getByLabelText("회사명")).toHaveValue("토스"),
    );
  });

  it("상세 다이얼로그에서 그 공고의 메모를 보여준다", async () => {
    const user = renderBoard();

    await user.click(
      await screen.findByRole("button", { name: "토스 프론트엔드 개발자" }),
    );

    expect(await screen.findByText("1차 면접 9/15 14:00")).toBeInTheDocument();
    expect(screen.getByLabelText("새 메모")).toHaveValue("");
  });

  // 모달을 보드 안에 두면 목록 조회가 실패했을 때 트리에서 사라져 헤더 버튼이
  // 아무 일도 하지 않는다. 공고를 못 불러올 때야말로 추가하고 싶은 상황이다.
  it("목록 조회가 실패해도 공고 추가 모달은 열린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "internal_error", message: "서버 오류" } },
          { status: 500 },
        ),
      ),
    );
    const user = renderBoard();

    await screen.findByText(/공고를 불러오지 못했습니다/);
    await user.click(screen.getByRole("button", { name: /공고 추가/ }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("공고 추가");
  });

  it("공고가 없으면 첫 공고 추가 안내를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ jobPostings: [] })),
    );
    renderBoard();

    expect(
      await screen.findByText("아직 등록한 공고가 없습니다."),
    ).toBeInTheDocument();
  });
});
