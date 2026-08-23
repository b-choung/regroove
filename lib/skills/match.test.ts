import { describe, expect, it } from "vitest";
import { matchSkills, normalizeSkill, toPercent } from "./match";

describe("normalizeSkill", () => {
  it("대소문자와 공백·점·하이픈 차이를 흡수한다", () => {
    expect(normalizeSkill("Next.js")).toBe(normalizeSkill("nextjs"));
    expect(normalizeSkill("React Native")).toBe(normalizeSkill("react-native"));
    expect(normalizeSkill("  TypeScript ")).toBe(normalizeSkill("typescript"));
  });

  it("널리 쓰이는 별칭을 같은 키로 모은다", () => {
    expect(normalizeSkill("JS")).toBe(normalizeSkill("JavaScript"));
    expect(normalizeSkill("리액트")).toBe(normalizeSkill("React.js"));
    expect(normalizeSkill("k8s")).toBe(normalizeSkill("Kubernetes"));
    expect(normalizeSkill("Postgres")).toBe(normalizeSkill("PostgreSQL"));
  });

  // 특수문자를 전부 지우면 C++와 C#이 모두 "c"가 되어 서로 매칭된다.
  it("C++와 C#을 구분한다", () => {
    expect(normalizeSkill("C++")).not.toBe(normalizeSkill("C#"));
    expect(normalizeSkill("C++")).not.toBe(normalizeSkill("C"));
  });
});

describe("matchSkills", () => {
  it("표기가 달라도 매칭하고 공고 표기를 그대로 돌려준다", () => {
    const result = matchSkills(
      ["TypeScript", "React.js", "Kubernetes"],
      ["typescript", "리액트"],
    );

    expect(result.matched).toEqual(["TypeScript", "React.js"]);
    expect(result.missing).toEqual(["Kubernetes"]);
    expect(toPercent(result.rate)).toBe(67);
  });

  it("공고에 기술스택이 없으면 비율을 계산하지 않는다", () => {
    expect(matchSkills([], ["React"])).toEqual({
      rate: null,
      matched: [],
      missing: [],
    });
  });

  it("내 스킬이 비어 있으면 0%", () => {
    const result = matchSkills(["React", "Vue"], []);

    expect(result.rate).toBe(0);
    expect(result.missing).toEqual(["React", "Vue"]);
  });

  // 같은 스택을 표기만 바꿔 두 번 적은 공고가 실제로 있다. 접지 않으면 분모가
  // 늘어나 매칭률이 낮게 나온다.
  it("같은 스택이 중복으로 적혀 있으면 한 번만 센다", () => {
    const result = matchSkills(["React", "react.js", "Vue"], ["React"]);

    expect(result.matched).toEqual(["React"]);
    expect(result.missing).toEqual(["Vue"]);
    expect(toPercent(result.rate)).toBe(50);
  });

  it("빈 문자열은 무시한다", () => {
    const result = matchSkills(["React", "  "], ["React"]);

    expect(result.rate).toBe(1);
    expect(result.missing).toEqual([]);
  });
});
