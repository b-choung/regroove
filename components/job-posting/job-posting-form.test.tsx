import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { JobPostingInput } from "@/types/job-posting";
import { JobPostingForm, toFormValues } from "./job-posting-form";

// 실제 제출 버튼은 다이얼로그 푸터에 있고 form 속성으로 연결된다.
// 테스트에서도 같은 방식으로 붙여 폼 밖 제출 경로를 그대로 검증한다.
// JobPostingForm은 controlled라 값의 주인이 필요하다. 실제 화면과 같은 구조
// (부모가 값을 들고, 제출 버튼은 form 밖에서 form 속성으로 연결)로 감싼다.
function Harness({ onSubmit }: { onSubmit: (input: JobPostingInput) => void }) {
  const [values, setValues] = useState(toFormValues);

  return (
    <>
      <JobPostingForm
        formId="test-form"
        values={values}
        onChange={setValues}
        onSubmit={onSubmit}
      />
      <button type="submit" form="test-form">
        저장
      </button>
    </>
  );
}

function renderForm(onSubmit = vi.fn()) {
  render(<Harness onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

describe("JobPostingForm", () => {
  it("회사명·제목이 비면 제출하지 않고 에러를 보여준다", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("회사명을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("공고 제목을 입력해주세요.")).toBeInTheDocument();
  });

  it("기술스택은 쉼표로 나누고, 빈 선택 항목은 null로 보낸다", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("회사명"), "토스");
    await user.type(screen.getByLabelText(/공고 제목/), "프론트엔드 개발자");
    await user.type(
      screen.getByLabelText(/기술스택/),
      "TypeScript, React ,, Next.js",
    );
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSubmit).toHaveBeenCalledWith({
      url: null,
      company: "토스",
      title: "프론트엔드 개발자",
      deadline: null,
      requiredSkills: ["TypeScript", "React", "Next.js"],
      status: "interested",
      source: "manual",
      rawContent: null,
    });
  });

  it("URL 형식이 아니면 제출을 막는다", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("회사명"), "토스");
    await user.type(screen.getByLabelText(/공고 제목/), "FE 개발자");
    await user.type(screen.getByLabelText(/공고 URL/), "wanted.co.kr/wd/12345");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("올바른 URL이 아닙니다.")).toBeInTheDocument();
  });
});
