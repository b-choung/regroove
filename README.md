# REGROOVE - 채용 공고 통합 트래커 (Job Application Tracker)

여러 채용 사이트에 흩어진 공고를 한곳에 모아 관리하고, 지원 프로세스를 칸반보드로 추적하는 개인 프로젝트입니다. 다시 리듬을 탄다는 의미를 부여해 REGROOVE라는 이름을 붙였습니다.

## 왜 만들었나

3년차 프론트엔드 개발자로, 2년의 공백 이후 재취업을 준비하면서 사람인·원티드·잡플래닛 등 여러 사이트에 흩어진 채용 공고를 스프레드시트로 관리하다가 한계를 느껴 직접 만들었습니다. 단순한 튜토리얼 프로젝트가 아니라 실제로 구직 활동에 사용하고 있는 도구입니다.

## 핵심 기능

- **로그인** — 이메일 매직링크(본인용), 가입 없이 예시 데이터로 바로 둘러보는 데모 계정
- **공고 등록** — URL 붙여넣으면 제목·회사명·기술스택·마감일 자동 추출, 실패 시 수동 입력
- **칸반보드** — 관심 → 지원 준비 → 지원 완료 → 서류 합격 → 면접 → 결과, 드래그 앤 드롭(낙관적 업데이트 + 롤백), 카드별 메모
- **기술스택 매칭** — 내 스택과 공고 요구 스택을 비교해 매칭률 표시
- **대시보드** — 전체/진행 중/최근 7일/마감 임박 요약, 단계별 통과율, 상태별 분포

## 기술 스택

| 영역           | 선택                              | 이유                                     |
| -------------- | --------------------------------- | ---------------------------------------- |
| 프레임워크     | Next.js (App Router) + TypeScript | 표준 스택, SSR로 초기 로딩 최적화        |
| DB / 인증      | Supabase (Postgres)               | 인증까지 한 번에, 낮은 러닝커브          |
| 드래그앤드롭   | dnd-kit                           | 유지보수 중단된 react-beautiful-dnd 대안 |
| 상태관리       | Zustand + TanStack Query          | 로컬 UI 상태와 서버 상태 분리            |
| 파싱           | Cheerio (JSON-LD → OG 폴백)       | 사이트별 마크업 차이 대응                |
| 스킬 매칭/요약 | Claude API                        | 공고 본문에서 기술스택 추출              |
| 스타일         | Tailwind CSS v4 + shadcn/ui       | 토큰을 CSS `@theme` 한 곳에서 관리       |
| 폰트           | Pretendard (자체 호스팅)          | 한글·라틴을 한 폰트로                    |
| 배포           | Vercel                            | 간단한 배포 파이프라인                   |

## 데이터 모델

```
JobPosting
- id, userId, url, company, title, deadline
- requiredSkills: string[]
- status: enum (interested, applying, applied, document_passed, interview, result)
- source: enum (saramin, wanted, jobplanet, manual)
- rawContent: text (파싱 실패 대비 원본 저장)
- position: double precision (칸반 컬럼 내 순서)

Note (JobPosting에 종속)
UserSkillProfile (skills, experienceYears)
```

`position`을 정수가 아니라 실수로 둔 이유: 드드래그 시 이웃 두 카드의 중간값을 넣으면 카드 한 장만 UPDATE하면 되고, 컬럼 전체 순서를 다시 쓸 필요가 없습니다. 모든 테이블은 RLS로 `auth.uid() = user_id` 행만 접근 가능합니다.

## API

클라이언트는 Supabase를 직접 호출하지 않고 자체 API Route를 거칩니다 (RLS 위에 서버 검증 한 겹 + 외부 사이트 파싱의 CORS 우회).

| 메서드           | 경로                           | 설명                                 |
| ---------------- | ------------------------------ | ------------------------------------ |
| GET/POST         | `/api/job-postings`            | 목록(position 순) / 생성             |
| GET/PATCH/DELETE | `/api/job-postings/[id]`       | 단건 조회 / 수정(낙관적 잠금) / 삭제 |
| GET/POST         | `/api/job-postings/[id]/notes` | 메모 목록 / 추가                     |
| DELETE           | `/api/notes/[id]`              | 메모 삭제                            |
| POST             | `/api/parse`                   | 공고 URL 파싱                        |
| GET/PUT          | `/api/skill-profile`           | 스킬 프로필 조회 / 저장              |

에러는 `{ error: { code, message, fields? } }`로 통일하고, 클라이언트는 HTTP status 대신 `code`로 분기합니다.

**동시 편집 충돌**: PATCH에 `expectedUpdatedAt`을 함께 보내면 서버가 `updated_at`이 일치하는 행만 수정합니다. 0행 갱신 시 409와 서버의 최신 데이터를 함께 돌려주고, 클라이언트는 그 값으로 캐시를 덮어씁니다.

## 주요 설계 결정

**드래그 앤 드롭**: 드롭 시점에만 새 position을 계산하고(`onDragOver`마다 계산하지 않음), `onMutate`로 캐시를 먼저 고쳐 화면에 즉시 반영합니다. 실패하면 스냅샷으로 롤백, 409 충돌이면 서버가 준 최신 데이터로 맞추고, 최종적으로 목록을 무효화해 서버 순서와 일치시킵니다.

**공고 파싱 폴백**: JSON-LD(schema.org JobPosting) → OG 메타태그 → Claude로 빈 필드만 추출 → 그래도 남으면 수동 입력. OG는 회사명조차 부정확해서(`og:site_name`이 플랫폼 이름으로 오는 경우) JSON-LD를 먼저 봅니다. 이미 채운 필드는 `known`으로 넘겨 LLM이 덮어쓰지 않게 합니다. 서버가 사용자 URL을 대신 요청하는 구조라 SSRF 방지를 위해 내부망 주소를 차단하고 리다이렉트도 매 홉 검사합니다.

**스킬 매칭**: 표기 차이("React.js"/"리액트"/"react")는 정규화하되, 별칭 표를 무한히 늘리는 대신 상세 화면엔 공고 원문 그대로 겹치는/없는 스택을 보여줍니다.

**대시보드 통계**: 별도 API 없이 보드가 쓰는 목록 캐시에서 계산합니다(개인 규모라 집계 쿼리 불필요). 단계는 누적이며(면접까지 갔으면 지원 완료 분모에도 포함), `result` 컬럼은 서류 탈락과 최종 면접 탈락이 구분 안 되므로 비율 계산에서 제외합니다.

## 디자인 시스템

조용함을 목표로 컬러는 중립 + 포인트 1개 + 경고 1개만 씁니다.

**컬러 — 세 계열만.** 중립(캔버스·표면·테두리·텍스트) + 포인트 1개 + 경고 1개.

| 역할                 | 토큰                            | 값                                |
| -------------------- | ------------------------------- | --------------------------------- |
| 캔버스/표면/보조표면 | `background` `card` `muted`     | `#f9fafb` / `#ffffff` / `#f3f4f7` |
| 테두리               | `border`                        | `#e2e4e8`                         |
| 본문/보조텍스트      | `foreground` `muted-foreground` | `#1c1f25` / `#686c74`             |
| 포인트               | `primary`                       | `#3e61c1`                         |
| 경고·삭제            | `destructive`                   | `#c92f33`                         |

포인트 컬러는 주 CTA·활성 탭·대시보드 막대·드롭 하이라이트·포커스 링에만 씁니다. 타이포는 크기 대신 굵기로 위계를 만들고(4단), 대시보드 숫자가 가장 큰 글자입니다 — 매번 확인하는 건 제목이 아니라 그 아래 숫자니까요. 칸반 컬럼은 배경·테두리 없이 카드만 떠 있는 형태로 두어, 컬럼이 회색 블록으로 겹쳐 보이지 않게 했습니다. 폰트는 Pretendard를 자체 호스팅(`display: swap`, preload는 끔 — 파일이 2MB라).

토큰은 [app/globals.css](app/globals.css)의 `@theme`에 모아뒀고, 다크모드 토큰은 준비돼 있지만 아직 켜지진 않았습니다.

## 트러블슈팅

- **PATCH가 나머지 필드를 초기화함**: 수정 스키마를 `.partial()`로 만들었는데 `.default()`가 안 벗겨져서, 한 필드만 보내도 나머지가 기본값으로 채워졌습니다. 생성용/수정용 스키마를 분리해서 해결.
- **낙관적 잠금이 항상 400**: `z.string().datetime()`이 `Z` 표기만 허용하는데 Postgres `timestamptz`는 오프셋(`+00:00`)으로 옵니다. `z.iso.datetime({ offset: true })`로 교체.
- **카드 순서가 무너짐**: 중간값 삽입 방식은 간격이 매번 반으로 줄어서, 같은 자리에 50번쯤 끼워 넣으면 double 정밀도 한계로 순서가 무작위가 됩니다. 간격이 좁아지면 컬럼 전체를 재번호하는 폴백 추가.
- **본문 텍스트를 뽑으니 JSON-LD가 사라짐**: `<script>` 태그를 지우는 과정에서 JSON-LD도 함께 지워져 1단계 파싱이 항상 실패하고 있었습니다. 결과는 맞았지만(2단계로 넘어감) 조용히 비용만 나가던 버그.
- **비율의 분모가 0일 때**: `0%`로 찍으면 "계산 불가"와 "전부 떨어짐"이 같은 화면이 됩니다. `number | null`로 두고 `null`은 `—`로 표시.
- **서버 전용 코드가 클라이언트 번들에 포함됨**: `publicEnv`/`serverEnv`를 한 파일에 두고 주석으로만 경계를 지켰더니, 클라이언트가 `publicEnv`를 import하는 순간 모듈 전체가 번들에 실렸습니다(`ANTHROPIC_API_KEY` 스키마 문자열이 프로덕션 청크에서 발견됨, 값 자체는 없었음). 파일을 분리하고 `import "server-only"`로 빌드 타임에 막음.
- **매직링크 배포 함정**: Redirect URL 미등록 시 Supabase가 에러 없이 조용히 Site URL로 대체(엉뚱한 도메인 이동), 내장 메일은 시간당 2통 제한, Resend SMTP는 사용자명이 이메일이 아니라 `resend` 고정. 세 가지 다 "증상이 원인을 안 가리키는" 종류라 오래 걸렸습니다.
- **메일 인증 자체가 방문자에게 장벽**: 그래서 매직링크는 본인용으로 남기고, 서버 전용 비밀번호로 세션을 만드는 데모 계정 경로를 따로 뒀습니다(JS 없는 `<form method="post">`, RLS로 데이터 분리).

## 주차별 개발 계획

| 주차  | 내용                                                         | 상태 |
| ----- | ------------------------------------------------------------ | ---- |
| 1주차 | 프로젝트 세팅, DB 스키마 설계, Supabase Auth 연동, 기본 CRUD | ✅   |
| 2주차 | 칸반보드 UI, dnd-kit 드래그앤드롭, 낙관적 업데이트 구현      | ✅   |
| 3주차 | URL 파싱 기능(OG태그 → LLM 폴백), 스킬 매칭 로직             | ✅   |
| 4주차 | 대시보드/통계 화면, 배포, 문서화, 버그 수정 및 디자인 다듬기 | ✅   |

- **1주차**: 매직링크 로그인, RLS 기반 스키마와 마이그레이션, 공고 CRUD API, 상태별 컬럼 보드와 추가/수정/삭제 UI.
- **2주차**: dnd-kit 드래그앤드롭(키보드 이동 포함), 낙관적 업데이트와 롤백, 카드 상세 다이얼로그와 메모 CRUD.
- **3주차**: URL 파싱 폴백 체인(JSON-LD/OG → Claude → 수동 입력), 파싱 결과 안내, 스킬 프로필 저장과 매칭률 표시.
- **4주차**: 대시보드(요약·단계 전환율·마감 알림·상태별 분포), 카드 마감일 D-day 강조, 로그인 후 화면을 라우트 그룹 레이아웃으로 정리, 배포 절차 문서화. 카드의 상태 Select는 걷어내고(상태 변경은 드래그와 상세 폼으로) 카드에서 바로 삭제하도록 바꿨습니다.

## 실행 방법

```bash
npm install
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY 입력
# supabase/migrations/의 SQL을 Supabase SQL Editor에서 실행
npm run dev
```

**데모 계정(선택)**: Supabase에서 유저를 만들고 `.env.local`에 `DEMO_EMAIL`/`DEMO_PASSWORD`(`NEXT_PUBLIC_` 붙이면 안 됨)를 넣음.

## 배포 (Vercel)

1. GitHub 저장소를 Vercel에 임포트 (Next.js 프리셋 그대로)
2. 환경변수 설정
3. Supabase > Authentication > URL Configuration에 배포 주소 등록 (Redirect URLs는 `https://<도메인>/**`, `https://*.vercel.app/**`는 남의 프로젝트까지 허용하므로 쓰지 않음)
4. **커스텀 SMTP 연결** — 내장 메일은 시간당 2통이라 배포용으로 쓸 수 없음
5. 새 프로젝트라면 마이그레이션 SQL 실행

## 스크린샷 / 데모

배포 링크: [REGROOVE](https://regroove-navy.vercel.app/) — 로그인 화면의 "가입 없이 둘러보기"를 누르면 데모 계정으로 바로 들어갑니다.

- 데모 GIF

![데모 GIF](https://github.com/user-attachments/assets/695ef655-cece-4330-9096-48d9cbf4fd66)

## 라이선스

MIT
