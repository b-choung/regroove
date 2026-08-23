# CLAUDE.md

Claude Code가 이 프로젝트에서 작업할 때 참고하는 컨텍스트 문서입니다.

## 프로젝트 개요

여러 채용 사이트(사람인, 원티드, 잡플래닛 등)에 흩어진 공고를 한곳에 모아 관리하고, 칸반보드 형태로 지원 상태를 추적하는 웹 애플리케이션입니다. 개발자 본인이 실제 구직 활동에 사용할 실용 도구이자 포트폴리오 프로젝트입니다.

## 기술 스택

- **프레임워크**: Next.js (App Router) + TypeScript
- **DB / 인증**: Supabase (Postgres, Supabase Auth)
- **드래그앤드롭**: dnd-kit
- **상태관리**: Zustand (로컬 UI 상태) + TanStack Query (서버 상태)
- **파싱**: Cheerio (서버사이드 HTML 파싱, OG 메타태그 우선)
- **AI 연동**: Anthropic Claude API (공고 본문에서 기술스택 추출, 요약)
- **스타일**: Tailwind CSS + shadcn/ui
- **배포**: Vercel

## 코딩 컨벤션

- 모든 컴포넌트와 함수는 TypeScript로 작성하며 `any` 타입 사용을 지양한다.
- 서버 상태(API 데이터)는 반드시 TanStack Query로 관리하고, `useState`로 직접 캐싱하지 않는다.
- UI 로컬 상태(모달 열림/닫힘, 드래그 중 임시 상태 등)만 Zustand를 사용한다.
- 컴포넌트는 `app/` 디렉토리 구조를 따르며, 재사용 가능한 UI는 `components/ui`(shadcn 기반), 도메인 컴포넌트는 `components/[domain]`에 위치시킨다.
- API 로직은 클라이언트에서 외부 사이트를 직접 호출하지 않고, 반드시 Next.js API Route를 통해 서버에서 프록시한다 (CORS 회피 목적).
- 커밋 메시지는 conventional commits 형식을 따른다 (`feat:`, `fix:`, `refactor:`, `docs:` 등).
- 단일 컴포넌트 300줄 초과를 금지한다. (초과 시 컴포넌트 분리)

## 아키텍처 원칙

### 공고 파싱은 3단계 폴백 구조를 유지한다

```
1. OG 메타태그 파싱 시도
2. 실패 시 HTML을 Claude API에 전달해 구조화된 JSON으로 추출
3. 그래도 실패하면 사용자에게 수동 입력 요청
```

새로운 파싱 로직을 추가할 때도 이 폴백 순서를 깨지 않아야 한다. 특정 사이트 전용 파서를 추가하고 싶다면 1단계 앞에 사이트별 커스텀 파서를 우선 시도하도록 확장하는 방식을 사용한다.

### 낙관적 업데이트 원칙

칸반보드에서 카드 상태를 이동시킬 때는 서버 응답을 기다리지 않고 UI를 먼저 업데이트한 뒤(optimistic update), 서버 요청이 실패하면 이전 상태로 롤백한다. TanStack Query의 `onMutate` / `onError` / `onSettled`를 활용한다.

### 동시 편집 충돌 처리

동일 카드를 여러 클라이언트(탭/기기)에서 동시에 옮길 가능성이 있으므로, `updatedAt` 타임스탬프 기준으로 충돌을 감지하고 최신 상태를 우선하는 방식을 기본으로 한다.

## 데이터 모델

```
JobPosting
- id, url, company, title, deadline
- requiredSkills: string[]
- status: enum (interested, applying, applied, document_passed, interview, result)
- source: enum (saramin, wanted, jobplanet, manual)
- rawContent: text
- createdAt, updatedAt

Note (JobPosting에 종속)
- id, jobPostingId, content, createdAt

UserSkillProfile
- skills: string[]
- experienceYears: number
```

스키마를 변경할 때는 Supabase 마이그레이션 파일을 함께 생성하고, `supabase/migrations/`에 기록한다.

## 개발 우선순위 (주차별)

Claude Code에게 작업을 요청할 때는 아래 순서를 기본 우선순위로 참고한다.

1. **1주차**: 프로젝트 세팅, DB 스키마, Supabase Auth 연동, 기본 CRUD
2. **2주차**: 칸반보드 UI, dnd-kit 드래그앤드롭, 낙관적 업데이트
3. **3주차**: URL 파싱 기능(OG태그 → LLM 폴백), 스킬 매칭 로직
4. **4주차**: 대시보드/통계, 배포, 문서화, 버그 수정 및 디자인 다듬기

새 기능을 요청할 때 이 순서에서 크게 벗어나지 않도록 하고, 아직 구현되지 않은 이전 단계 기능에 의존하는 작업이라면 먼저 알려달라고 요청한다.

## 테스트

- 비즈니스 로직(파싱 폴백, 스킬 매칭 스코어링)은 Vitest로 단위 테스트를 작성한다.
- UI 컴포넌트는 Testing Library로 주요 인터랙션(드래그, 카드 생성/삭제)에 한해 테스트한다.
- 100% 커버리지를 목표로 하지 않으며, 트러블슈팅 가치가 있는 로직 위주로 테스트를 작성한다.

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

`.env.local`은 절대 커밋하지 않는다. `.env.example`만 저장소에 포함한다.

## Claude Code에게 요청할 때 참고사항

- 이 프로젝트는 포트폴리오 겸 실사용 도구이므로, 코드 품질뿐 아니라 README에 기록할 만한 "트러블슈팅 스토리"가 남도록 문제 해결 과정을 커밋 메시지나 주석에 간단히 남겨줄 것을 요청해도 좋다.
- 새 라이브러리를 추가할 때는 왜 그 라이브러리를 선택했는지 한 줄 이유를 함께 남긴다 (README 업데이트 시 활용).
- UI 작업 시 Tailwind + shadcn/ui 컴포넌트를 우선 활용하고, 커스텀 CSS는 최소화한다.
