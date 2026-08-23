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
- id, url, company, title, deadline
- requiredSkills: string[]
- status: enum (interested, applying, applied, document_passed, interview, result)
- source: enum (saramin, wanted, jobplanet, manual)
- rawContent: text (파싱 실패 대비 원본 저장)
- createdAt, updatedAt

Note (JobPosting에 종속)
- id, jobPostingId, content, createdAt

UserSkillProfile
- skills: string[]
- experienceYears: number
```

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

> 개발 과정에서 겪은 문제와 해결 과정을 이곳에 기록합니다. (예시)

- **문제**: 드래그 중 다른 브라우저 탭에서 동일 카드를 이동시키는 경우 상태 충돌 발생
  **해결**: 낙관적 업데이트 후 서버 응답 실패 시 롤백하는 방식으로 처리, `updatedAt` 기준 충돌 감지 로직 추가
- **문제**: LLM API 호출 비용 및 응답 속도 이슈
  **해결**: 동일 URL에 대한 파싱 결과 캐싱, 실패 시 지수 백오프(exponential backoff) 재시도 로직 적용

## 주차별 개발 계획

| 주차  | 내용                                                         |
| ----- | ------------------------------------------------------------ |
| 1주차 | 프로젝트 세팅, DB 스키마 설계, Supabase Auth 연동, 기본 CRUD |
| 2주차 | 칸반보드 UI, dnd-kit 드래그앤드롭, 낙관적 업데이트 구현      |
| 3주차 | URL 파싱 기능(OG태그 → LLM 폴백), 스킬 매칭 로직             |
| 4주차 | 대시보드/통계 화면, 배포, 문서화, 버그 수정 및 디자인 다듬기 |

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY 입력

# 개발 서버 실행
npm run dev
```

## 스크린샷 / 데모

> 배포 후 실제 사용 화면 스크린샷과 데모 GIF를 이곳에 추가합니다.

- 배포 링크: (추가 예정)
- 데모 GIF: (추가 예정)

## 라이선스

MIT
