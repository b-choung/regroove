# Regroove

여러 채용 사이트(사람인, 원티드, 잡플래닛 등)에 흩어진 공고를 한곳에 모아 관리하고,
칸반보드로 지원 상태를 추적하는 웹 애플리케이션입니다.

## 기술 스택

| 영역 | 선택 | 선택 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 (App Router) + TypeScript | 외부 사이트 파싱을 서버에서 프록시해야 해 SSR/API Route가 한 프로젝트에 필요 |
| DB / 인증 | Supabase (Postgres + Auth) | RLS로 사용자별 데이터 격리를 DB 레벨에서 처리, 별도 백엔드 불필요 |
| 서버 상태 | TanStack Query | 칸반 드래그의 낙관적 업데이트/롤백(`onMutate`/`onError`)을 표준화된 형태로 구현 |
| UI 로컬 상태 | Zustand | 모달·드래그 임시 상태만 담는 가벼운 스토어가 필요 |
| 드래그앤드롭 | dnd-kit | react-beautiful-dnd 대비 유지보수가 활발하고 React 19 지원 |
| 파싱 | Cheerio | 서버사이드에서 OG 메타태그를 가볍게 추출 (headless 브라우저 불필요) |
| AI | Anthropic Claude API | OG 태그로 못 잡는 공고 본문에서 기술스택/요약을 구조화 JSON으로 추출 |
| 스타일 | Tailwind CSS v4 + shadcn/ui | 컴포넌트 소유권을 유지하면서 빠르게 UI 구성 |
| 검증 | Zod | API Route와 폼이 같은 스키마를 공유 |
| 테스트 | Vitest + Testing Library | Vite 기반으로 빠르고 Next 프로젝트에 설정 부담이 적음 |

## 시작하기

### 1. 환경변수

```bash
cp .env.example .env.local
```

| 변수 | 위치 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 대시보드 > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 위와 동일 |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com (서버 전용) |

### 2. DB 마이그레이션 적용

Supabase 대시보드의 SQL Editor에 `supabase/migrations/0001_init.sql` 내용을 붙여 실행하거나,
Supabase CLI를 사용합니다.

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### 3. Auth 설정

매직링크 로그인을 사용합니다. Supabase 대시보드 > Authentication > URL Configuration에서
Redirect URL에 아래를 추가해야 합니다.

```
http://localhost:3000/auth/callback
https://<배포도메인>/auth/callback
```

### 4. 개발 서버

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run typecheck
npm test
```

## 디렉터리 구조

```
app/
  auth/callback/route.ts   매직링크·OAuth 코드를 세션 쿠키로 교환
  auth/signout/route.ts    로그아웃
  login/page.tsx           로그인 화면
  page.tsx                 칸반보드 (2주차에 dnd-kit 연결)
components/
  ui/                      shadcn/ui 컴포넌트
  auth/                    인증 도메인 컴포넌트
  providers.tsx            TanStack Query Provider
lib/
  supabase/client.ts       브라우저용 Supabase 클라이언트
  supabase/server.ts       서버용 클라이언트 + getCurrentUser()
  supabase/proxy.ts        세션 갱신 & 미인증 리다이렉트
  mappers/                 DB row(snake_case) ↔ 도메인(camelCase) 변환
  env.ts                   환경변수 Zod 검증 (public/server 분리)
  query-client.ts          QueryClient 기본 설정
  query-keys.ts            쿼리 키 중앙 관리
stores/
  ui-store.ts              Zustand UI 로컬 상태
types/
  database.ts              Supabase 스키마 타입 (snake_case)
  job-posting.ts           도메인 타입 + Zod 입력 스키마
proxy.ts                   Next.js 16 프록시(구 middleware) 엔트리
supabase/migrations/       스키마 마이그레이션
```

## 설계 노트

### 공고 파싱 3단계 폴백 (3주차 구현 예정)

```
1. 사이트별 커스텀 파서 (있으면)
2. OG 메타태그 파싱
3. HTML → Claude API 구조화 JSON 추출
4. 그래도 실패하면 수동 입력 요청
```

### 동시 편집 충돌 감지

`job_postings.updated_at`은 DB 트리거(`set_updated_at`)로 갱신됩니다.
클라이언트가 마지막으로 본 `updatedAt`을 `expectedUpdatedAt`으로 함께 보내면
서버가 더 최신 버전이 있는지 비교해 충돌을 감지합니다.

### 칸반 정렬 위치

`position`은 정수가 아닌 `double precision`입니다. 카드를 이웃 두 장 사이로 옮길 때
중간값만 계산해 넣으면 되므로, 컬럼 전체를 재번호 매기는 UPDATE를 피할 수 있습니다.

## 트러블슈팅 기록

- **`.gitignore`의 `.env*`가 `.env.example`까지 삼킴** — create-next-app 기본 `.gitignore`는
  `.env*` 전체를 무시하므로 `!.env.example` 예외를 추가했습니다.
- **Next.js 16에서 `middleware.ts` → `proxy.ts`** — Supabase 세션 갱신 로직을 `proxy.ts`에
  두었습니다. `proxy.ts`는 항상 Node.js 런타임에서 실행되며 route segment config를 허용하지 않습니다.
- **`useSearchParams`와 정적 프리렌더** — 로그인 폼이 `?next=` 파라미터를 읽어야 해서
  `page.tsx`(서버)에서 `Suspense`로 감싸고 폼만 클라이언트 컴포넌트로 분리했습니다.
