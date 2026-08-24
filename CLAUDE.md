# CLAUDE.md

여러 채용 사이트 공고를 모아 칸반보드로 지원 상태를 관리하는 Next.js 앱. 포트폴리오 겸 실사용 도구.

## Stack

Next.js (App Router) + TS, Supabase (Postgres/Auth), dnd-kit, Zustand(로컬 UI)+TanStack Query(서버 상태), Cheerio(OG 파싱), Claude API(스택 추출/요약), Tailwind+shadcn/ui, Vercel

## Rules

- `any` 금지
- 서버 상태 = TanStack Query만. `useState` 캐싱 금지
- 로컬 UI 상태(모달, 드래그 임시값) = Zustand만
- 구조: `components/ui`(shadcn), `components/[domain]`(도메인)
- 외부 API는 클라이언트 직접 호출 금지 → Next.js API Route로 프록시
- 커밋: conventional commits (`feat:` `fix:` `refactor:` `docs:`)
- 컴포넌트 300줄 초과 시 분리

## 파싱 폴백 (순서 변경 금지)

1. OG 메타태그 → 2. Claude API로 HTML→JSON 추출 → 3. 수동 입력

- 사이트별 파서 추가 시 1단계 앞에 우선 시도로 확장

## 상태 동기화

- 칸반 이동: optimistic update (`onMutate`/`onError`/`onSettled`), 실패 시 롤백
- 동시 편집 충돌: `updatedAt` 기준 최신 우선

## 데이터 모델

```
JobPosting: id, url, company, title, deadline, requiredSkills[],
  status(interested|applying|applied|document_passed|interview|result),
  source(saramin|wanted|jobplanet|manual), rawContent, createdAt, updatedAt
Note: id, jobPostingId, content, createdAt
UserSkillProfile: skills[], experienceYears
```

스키마 변경 시 `supabase/migrations/`에 마이그레이션 파일 동반

## 개발 순서

1주: 세팅/스키마/Auth/CRUD → 2주: 칸반+DnD+optimistic update → 3주: URL 파싱+스킬매칭 → 4주: 대시보드/배포/문서화
※ 순서 벗어난 요청은 선행 의존성 있으면 먼저 확인

## 테스트

Vitest: 파싱 폴백/스킬 매칭 로직만. Testing Library: 드래그·카드 CRUD만. 커버리지 100% 불필요.

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=
```

`.env.local` 커밋 금지, `.env.example`만 포함

## 기타

- 트러블슈팅 과정은 커밋/주석에 짧게 남길 것 (README용)
- 새 라이브러리 추가 시 선택 이유 한 줄 남길 것
- 커스텀 CSS 최소화, Tailwind+shadcn 우선
