/**
 * 스킬 매칭.
 *
 * 공고마다 표기가 달라서("React.js", "리액트", "react") 문자열 비교로는 거의
 * 맞지 않는다. 그래서 비교 전에 정규화하고, 널리 쓰이는 표기 차이만 별칭으로
 * 흡수한다. 별칭 표를 무한히 늘리는 대신 화면에서 matched/missing을 그대로
 * 보여줘, 매칭이 틀렸을 때 사용자가 바로 알아볼 수 있게 한다.
 */

/** 정규화한 뒤에도 다른 문자열로 남는 흔한 표기 차이. (키·값 모두 정규화된 형태) */
const ALIASES: Record<string, string> = {
  js: "javascript",
  자바스크립트: "javascript",
  ts: "typescript",
  타입스크립트: "typescript",
  reactjs: "react",
  리액트: "react",
  reactnative: "react native",
  rn: "react native",
  vuejs: "vue",
  뷰: "vue",
  nextjs: "next",
  nuxtjs: "nuxt",
  node: "nodejs",
  노드: "nodejs",
  py: "python",
  파이썬: "python",
  golang: "go",
  k8s: "kubernetes",
  쿠버네티스: "kubernetes",
  postgres: "postgresql",
  psql: "postgresql",
  gql: "graphql",
  tailwindcss: "tailwind",
  scss: "sass",
  html5: "html",
  css3: "css",
};

/**
 * 비교용 키로 바꾼다.
 *
 * 공백·점·하이픈·밑줄만 없애고 `+`와 `#`은 남긴다. 특수문자를 전부 지우면
 * "C++"와 "C#"이 모두 "c"가 되어 서로 매칭돼 버린다.
 */
export function normalizeSkill(skill: string): string {
  const key = skill
    .toLowerCase()
    .replace(/[\s._-]/g, "")
    .trim();

  return ALIASES[key] ?? key;
}

export interface SkillMatch {
  /** 0~1 사이 비율. 공고에 기술스택 정보가 없으면 null(= 계산 불가). */
  rate: number | null;
  /** 내 스킬과 겹치는 공고 요구 스택 (공고 표기 그대로) */
  matched: string[];
  /** 내게 없는 공고 요구 스택 (공고 표기 그대로) */
  missing: string[];
}

export function matchSkills(
  requiredSkills: string[],
  mySkills: string[],
): SkillMatch {
  const mine = new Set(mySkills.map(normalizeSkill).filter(Boolean));

  const matched: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const skill of requiredSkills) {
    const key = normalizeSkill(skill);
    // 같은 스택이 표기만 다르게 두 번 적힌 공고가 있어, 비율이 왜곡되지 않게 접는다.
    if (!key || seen.has(key)) continue;
    seen.add(key);

    (mine.has(key) ? matched : missing).push(skill);
  }

  const total = matched.length + missing.length;
  return {
    rate: total === 0 ? null : matched.length / total,
    matched,
    missing,
  };
}

/** 화면 표시용 정수 퍼센트. */
export function toPercent(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 100);
}
