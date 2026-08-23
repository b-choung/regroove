# 채용 공고 통합 트래커 (Job Application Tracker)

여러 채용 사이트에 흩어진 공고를 한곳에 모아 관리하고, 지원 프로세스를 칸반보드로 추적하는 개인 프로젝트입니다.

## 왜 만들었나

3년차 프론트엔드 개발자로, 2년의 공백 이후 재취업을 준비하면서 사람인·원티드·잡플래닛 등 여러 사이트에 흩어진 채용 공고를 스프레드시트로 관리하다가 한계를 느껴 직접 만들었습니다. 단순한 튜토리얼 프로젝트가 아니라 실제로 구직 활동에 사용하고 있는 도구입니다.

## 핵심 기능

### 1. 공고 등록

- URL을 붙여넣으면 페이지를 파싱해 제목, 회사명, 기술스택, 마감일을 자동으로 추출
- 자동 파싱이 실패하면 수동 입력 폼으로 대체

### 2. 지원 상태 관리 (칸반보드)

- 컬럼: 관심 → 지원 예정 → 지원 완료 → 서류합격 → 면접 → 최종 결과
- 드래그 앤 드롭으로 카드 상태 이동
- 카드 클릭 시 상세 정보(메모, 면접 일정, 담당자 연락처 등) 확인

### 3. 기술스택 매칭

- 본인의 기술스택을 미리 등록
- 공고에서 추출한 기술스택과 비교해 매칭률(%) 표시
- 매칭되지 않는 스택 하이라이트

### 4. 대시보드

- 이번 주 지원 개수, 서류 통과율, 면접 전환율 등 통계
- 마감 임박 공고 알림

## 기술 스택

| 영역           | 선택                              | 이유                                               |
| -------------- | --------------------------------- | -------------------------------------------------- |
| 프레임워크     | Next.js (App Router) + TypeScript | 표준 스택, SSR로 초기 로딩 최적화                  |
| DB / 인증      | Supabase (Postgres)               | 인증까지 한 번에 해결, 학습 곡선 낮음              |
| 드래그앤드롭   | dnd-kit                           | 유지보수 중단된 react-beautiful-dnd 대신 현재 표준 |
| 상태관리       | Zustand + TanStack Query          | 로컬 UI 상태와 서버 상태를 명확히 분리             |
| 파싱           | Cheerio (OG 메타태그 우선)        | 사이트별 마크업 차이에 대응하는 폴백 구조          |
| 스킬 매칭/요약 | Claude API                        | 공고 본문에서 기술스택 자동 추출 및 요약           |
| 스타일         | Tailwind CSS + shadcn/ui          | 빠른 개발 속도와 일관된 디자인                     |
| 배포           | Vercel                            | 무료, 간단한 배포 파이프라인                       |

## 데이터 모델

```
JobPosting
- id, userId, url, company, title, deadline
- requiredSkills: string[]
- status: enum (interested, applying, applied, document_passed, interview, result)
- source: enum (saramin, wanted, jobplanet, manual)
- rawContent: text (파싱 실패 대비 원본 저장)
- position: double precision (칸반 컬럼 내 정렬 위치)
- createdAt, updatedAt

Note (JobPosting에 종속)
- id, jobPostingId, content, createdAt

UserSkillProfile
- skills: string[]
- experienceYears: number
```

`position`을 정수가 아니라 실수로 둔 이유: 드래그로 카드를 재정렬할 때 이웃 두 카드의 중간값을 넣으면 카드 한 장만 UPDATE 하면 되므로, 컬럼 전체의 순서를 다시 쓰지 않아도 됩니다.

모든 테이블은 RLS로 `auth.uid() = user_id`인 행만 접근할 수 있고, 스키마는 [supabase/migrations/](supabase/migrations/)에 기록합니다.

## API

클라이언트는 Supabase를 직접 호출하지 않고 전부 자체 API Route를 거칩니다. (RLS 위에 서버 검증을 한 겹 더 두고, 3주차 외부 사이트 파싱의 CORS 우회 경로를 같은 자리에 두기 위함)

| 메서드 | 경로                     | 설명                                |
| ------ | ------------------------ | ----------------------------------- |
| GET    | `/api/job-postings`      | 목록 (position 순)                  |
| POST   | `/api/job-postings`      | 생성 (해당 컬럼 맨 아래에 배치)     |
| GET    | `/api/job-postings/[id]` | 단건 조회                           |
| PATCH  | `/api/job-postings/[id]` | 부분 수정 / 상태 이동 (낙관적 잠금) |
| DELETE | `/api/job-postings/[id]` | 삭제                                |

실패 응답은 `{ error: { code, message, fields? } }` 형태로 통일했고, 클라이언트는 HTTP status 대신 `code`(`unauthorized`, `invalid_request`, `not_found`, `conflict`, `duplicate_url`, `internal_error`)로 분기합니다.

### 동시 편집 충돌 (낙관적 잠금)

PATCH에 클라이언트가 마지막으로 본 `expectedUpdatedAt`을 함께 보내면, 서버가 `updated_at`이 일치하는 행만 UPDATE 합니다. 0행이 갱신되면 그 사이 누군가 먼저 수정한 것이므로 409와 **서버의 최신 공고**를 함께 돌려주고, 클라이언트는 그 값으로 캐시를 덮어써 "최신 상태 우선" 정책을 맞춥니다.

## 아키텍처: 공고 파싱 폴백 체인

사이트마다 마크업 구조가 달라 100% 자동 파싱이 불가능하다는 문제를, 다음과 같은 3단계 폴백 구조로 해결했습니다.

```
URL 입력
  │
  ▼
1단계: OG 메타태그 파싱 시도 (og:title, og:description 등)
  │ 실패
  ▼
2단계: 페이지 HTML을 Claude API에 전달해
        구조화된 JSON(제목/회사명/기술스택/마감일)으로 추출 요청
  │ 실패
  ▼
3단계: 수동 입력 폼으로 사용자에게 요청
```

또한 클라이언트에서 외부 채용 사이트로 직접 요청 시 CORS 이슈가 발생하므로, Next.js API Route를 통해 서버에서 프록시하여 페이지를 가져오는 구조로 설계했습니다.

## 트러블슈팅

### 1. 한 필드만 수정했는데 나머지 필드가 초기화됐다

수정용 스키마를 `jobPostingInputSchema.partial()`로 만들었는데, Zod의 `.partial()`은 `.default()`를 벗기지 않습니다. 그래서 `{ status: "interview" }`만 담아 PATCH를 보내도 스키마가 `url: null`, `deadline: null`, `requiredSkills: []`, `source: "manual"`을 기본값으로 채워 넣어, 저장해 둔 값이 통째로 날아갔습니다. 매퍼에서 `undefined` 필드를 제외하는 방어 로직이 있었지만 스키마가 이미 값을 채운 뒤라 소용이 없었습니다.

기본값이 없는 필드 정의를 따로 분리해, **생성용 스키마에만 기본값을 얹고 수정용 스키마는 순수 `partial()`로** 만들어 해결했습니다. 회귀를 막는 테스트를 함께 남겼습니다.

### 2. 낙관적 잠금이 항상 실패했다

`expectedUpdatedAt`을 `z.string().datetime()`으로 검증했는데, 이 검증기는 `Z`로 끝나는 표기만 허용합니다. Postgres `timestamptz`는 `2026-08-23T06:00:00.123456+00:00`처럼 오프셋 표기로 직렬화되므로, DB에서 읽은 `updated_at`을 그대로 되돌려보내는 낙관적 잠금 요청이 전부 400으로 거부됐습니다. `z.iso.datetime({ offset: true })`로 교체했습니다.

### 3. Supabase 타입이 통째로 `never`가 됐다

`supabase gen types` 대신 손으로 옮겨 적은 `Database` 타입을 쓰고 있었는데, 모든 `insert`/`update` 호출이 "not assignable to type 'never'"로 실패했습니다. 원인은 두 가지였습니다.

- 테이블 정의에 PostgREST 조인 추론용 `Relationships` 필드가 없었다.
- `Row`를 `interface`로 선언했다. **TypeScript는 interface에 암시적 인덱스 시그니처를 부여하지 않아서** supabase-js가 요구하는 `Record<string, unknown>` 제약을 만족하지 못한다. `type` alias로 바꿔야 통과한다.

둘 중 하나만 어긋나도 스키마 전체가 제약에서 탈락하고, 조건부 타입의 `never` 분기로 떨어져 원인과 동떨어진 에러 메시지가 나옵니다.

### 4. API 요청이 JSON 대신 HTML을 받아왔다

세션이 없는 요청을 `/login`으로 리다이렉트하는 미들웨어(Next.js 16의 `proxy.ts`)가 `/api/*`까지 함께 리다이렉트하고 있었습니다. `fetch`는 리다이렉트를 따라가 로그인 **페이지 HTML**을 200으로 받아오고, 클라이언트는 그걸 JSON으로 파싱하다 엉뚱한 에러를 던졌습니다. API 경로는 리다이렉트 대신 401 JSON을 반환하도록 분기해, 클라이언트가 세션 만료를 코드로 구분할 수 있게 했습니다.

## 주차별 개발 계획

| 주차  | 내용                                                         | 상태 |
| ----- | ------------------------------------------------------------ | ---- |
| 1주차 | 프로젝트 세팅, DB 스키마 설계, Supabase Auth 연동, 기본 CRUD | ✅   |
| 2주차 | 칸반보드 UI, dnd-kit 드래그앤드롭, 낙관적 업데이트 구현      |      |
| 3주차 | URL 파싱 기능(OG태그 → LLM 폴백), 스킬 매칭 로직             |      |
| 4주차 | 대시보드/통계 화면, 배포, 문서화, 버그 수정 및 디자인 다듬기 |      |

1주차 결과물: 매직링크 로그인, RLS 기반 스키마와 마이그레이션, 공고 CRUD API, 상태별 컬럼 보드와 추가/수정/삭제 UI. 카드 이동은 아직 드래그가 아니라 카드의 상태 Select로 합니다(2주차에 dnd-kit으로 교체). 메모(Note)와 스킬 프로필 CRUD는 각각 상세 시트(2주차)와 스킬 매칭(3주차)에서 화면과 함께 붙입니다.

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY 입력

# DB 스키마 적용 (supabase/migrations/의 SQL을 Supabase SQL Editor에서 실행)

# 개발 서버 실행
npm run dev
```

```bash
npm test        # Vitest 단위/컴포넌트 테스트
npm run typecheck
npm run lint
```

## 스크린샷 / 데모

> 배포 후 실제 사용 화면 스크린샷과 데모 GIF를 이곳에 추가합니다.

- 배포 링크: (추가 예정)
- 데모 GIF: (추가 예정)

## 라이선스

MIT
