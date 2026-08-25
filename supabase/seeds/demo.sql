-- 데모 계정 시드 데이터
--
-- 사용법
--   1) Supabase > Authentication > Users 에서 데모 계정의 User UID를 복사한다.
--   2) 아래 demo_id 값을 그 UID로 바꾼다.
--   3) SQL Editor에서 실행한다.
--
-- 방문자가 카드를 옮기거나 지워도 이 스크립트를 다시 실행하면 원래 상태로
-- 돌아온다. (해당 사용자의 공고를 전부 지우고 다시 넣는다 — 메모는 FK cascade)
--
-- 마감일은 고정 날짜가 아니라 current_date 기준 상대값이다. 몇 달 뒤에 데모를
-- 열어도 "D-3", "마감 지남"이 의미 있게 보이도록 하기 위함이다.

do $$
declare
  demo_id uuid := '00000000-0000-0000-0000-000000000000'; -- ← 데모 계정 User UID
begin
  if not exists (select 1 from auth.users where id = demo_id) then
    raise exception '데모 계정 UID를 찾을 수 없습니다: %', demo_id;
  end if;

  delete from public.job_postings where user_id = demo_id;

  insert into public.job_postings
    (user_id, url, company, title, deadline, required_skills, status, source, raw_content, position)
  values
    -- 관심: 마감이 임박한 건 하나를 섞어 D-day 강조가 보이게 한다.
    (demo_id, 'https://www.wanted.co.kr/wd/000001', '토스', '프론트엔드 개발자 (코어)',
     current_date + 3, array['TypeScript','React','Next.js'], 'interested', 'wanted', null, 1024),
    (demo_id, 'https://www.wanted.co.kr/wd/000002', '당근', '웹 프론트엔드 엔지니어',
     current_date + 21, array['TypeScript','React','GraphQL'], 'interested', 'wanted', null, 2048),

    -- 지원 준비: 마감이 지난 건 하나 (대시보드 "마감 지남" 확인용)
    (demo_id, 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=000003', '무신사', '프론트엔드 개발자',
     current_date - 2, array['React','Redux','Storybook'], 'applying', 'saramin', null, 1024),

    -- 지원 완료
    (demo_id, 'https://www.jobplanet.co.kr/job/search?posting_id=000004', '카카오', 'FE 개발자 (커머스)',
     current_date + 10, array['TypeScript','React','Node.js'], 'applied', 'jobplanet', null, 1024),
    (demo_id, null, '네이버', '프론트엔드 개발자 (지도)',
     null, array['TypeScript','React','WebGL'], 'applied', 'manual', '지인 추천으로 알게 된 공고. 공고 링크 없음.', 2048),

    -- 서류 합격 / 면접 / 결과 — 퍼널 숫자가 보이도록 각 단계에 하나씩
    (demo_id, 'https://www.wanted.co.kr/wd/000006', '라인', '프론트엔드 개발자',
     current_date + 14, array['TypeScript','Vue.js','Nuxt'], 'document_passed', 'wanted', null, 1024),
    (demo_id, 'https://www.wanted.co.kr/wd/000007', '쿠팡', 'Frontend Engineer',
     current_date + 7, array['TypeScript','React','AWS'], 'interview', 'wanted', null, 1024),
    (demo_id, 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=000008', '야놀자', '프론트엔드 개발자',
     current_date - 20, array['JavaScript','React'], 'result', 'saramin', null, 1024);

  -- 메모: 면접 단계 공고에만 붙여 상세 화면에서 쓰임새가 보이게 한다.
  insert into public.notes (job_posting_id, content)
  select id, '1차 기술 면접 완료. 라이브 코딩 40분 + 시스템 설계 20분.'
  from public.job_postings
  where user_id = demo_id and company = '쿠팡';

  insert into public.notes (job_posting_id, content)
  select id, '서류 합격 메일 수신. 면접 일정 조율 중 (다음 주 화/목 가능).'
  from public.job_postings
  where user_id = demo_id and company = '라인';

  -- 스킬 프로필: 없으면 카드에 매칭률이 아예 표시되지 않아 기능이 안 보인다.
  insert into public.user_skill_profiles (user_id, skills, experience_years)
  values (demo_id, array['TypeScript','React','Next.js','Node.js','Tailwind CSS'], 3)
  on conflict (user_id) do update
    set skills = excluded.skills,
        experience_years = excluded.experience_years;
end $$;
