import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui-store";
import type { ParsedJobPosting } from "@/types/parsing";
import { CreateJobPostingDialog } from "./create-job-posting-dialog";

const parsed: ParsedJobPosting = {
  url: "https://www.wanted.co.kr/wd/12345",
  source: "wanted",
  title: "프론트엔드 개발자",
  company: "토스",
  deadline: null,
  requiredSkills: ["TypeScript", "React"],
  rawContent: "공고 본문",
  strategy: "llm",
  missing: ["deadline"],
  warnings: ["공고 원문이 길어 앞부분만 저장합니다."],
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CreateJobPostingDialog />
    </QueryClientProvider>,
  );

  return userEvent.setup();
}

beforeEach(() => {
  useUiStore.setState({
    isCreateDialogOpen: true,
    selectedJobPostingId: null,
    draggingJobPostingId: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ parsed })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useUiStore.setState({ isCreateDialogOpen: false });
});

describe("CreateJobPostingDialog", () => {
  it("URL을 불러오면 파싱 결과로 폼을 채운다", async () => {
    const user = renderDialog();

    await user.type(
      screen.getByLabelText("공고 URL로 불러오기"),
      "https://www.wanted.co.kr/wd/12345",
    );
    await user.click(screen.getByRole("button", { name: /불러오기/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("회사명")).toHaveValue("토스"),
    );
    expect(screen.getByLabelText(/공고 제목/)).toHaveValue("프론트엔드 개발자");
    expect(screen.getByLabelText(/기술스택/)).toHaveValue("TypeScript, React");
    expect(screen.getByLabelText(/공고 원문/)).toHaveValue("공고 본문");
  });

  // 자동 입력이 조용히 틀리는 게 가장 위험하다. 어디까지 채웠고 무엇을 확인해야
  // 하는지 화면에 남아야 한다.
  it("추출 단계와 남은 입력·경고를 그대로 보여준다", async () => {
    const user = renderDialog();

    await user.type(
      screen.getByLabelText("공고 URL로 불러오기"),
      "https://www.wanted.co.kr/wd/12345",
    );
    await user.click(screen.getByRole("button", { name: /불러오기/ }));

    expect(await screen.findByText("AI가 본문에서 추출")).toBeInTheDocument();
    expect(screen.getByText(/직접 입력해주세요: 마감일/)).toBeInTheDocument();
    expect(
      screen.getByText("공고 원문이 길어 앞부분만 저장합니다."),
    ).toBeInTheDocument();
  });

  it("파싱이 채우지 못한 값은 사용자가 입력한 내용을 지우지 않는다", async () => {
    const user = renderDialog();

    // 마감일을 먼저 손으로 넣고 나서 URL을 불러온다.
    await user.type(screen.getByLabelText(/마감일/), "2026-09-30");
    await user.type(
      screen.getByLabelText("공고 URL로 불러오기"),
      "https://www.wanted.co.kr/wd/12345",
    );
    await user.click(screen.getByRole("button", { name: /불러오기/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("회사명")).toHaveValue("토스"),
    );
    expect(screen.getByLabelText(/마감일/)).toHaveValue("2026-09-30");
  });
});
