-- 0001_init.sql
-- 초기 스키마: job_postings / notes / user_skill_profiles
-- 모든 테이블은 RLS로 소유자(auth.uid())만 접근 가능하도록 제한한다.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.job_status as enum (
  'interested',
  'applying',
  'applied',
  'document_passed',
  'interview',
  'result'
);

create type public.job_source as enum (
  'saramin',
  'wanted',
  'jobplanet',
  'manual'
);

-- ---------------------------------------------------------------------------
-- updated_at 자동 갱신 트리거
-- 동시 편집 충돌 감지(updated_at 비교)를 DB 레벨에서 신뢰할 수 있게 만든다.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- job_postings
-- ---------------------------------------------------------------------------
create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text,
  company text not null,
  title text not null,
  deadline date,
  required_skills text[] not null default '{}',
  status public.job_status not null default 'interested',
  source public.job_source not null default 'manual',
  raw_content text,
  -- 칸반 컬럼 내 정렬 위치. dnd-kit 재정렬 시 이웃 두 카드의 중간값을 넣어
  -- 카드 하나만 UPDATE 하면 되도록 정수 대신 실수를 사용한다.
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_postings_user_status_idx
  on public.job_postings (user_id, status, position);

create index job_postings_deadline_idx
  on public.job_postings (user_id, deadline)
  where deadline is not null;

-- 같은 공고 URL을 두 번 저장하는 실수를 DB에서 막는다.
create unique index job_postings_user_url_key
  on public.job_postings (user_id, url)
  where url is not null;

create trigger job_postings_set_updated_at
  before update on public.job_postings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notes (job_postings에 종속)
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index notes_job_posting_idx
  on public.notes (job_posting_id, created_at desc);

-- ---------------------------------------------------------------------------
-- user_skill_profiles (사용자당 1개)
-- ---------------------------------------------------------------------------
create table public.user_skill_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  skills text[] not null default '{}',
  experience_years numeric(4, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_skill_profiles_set_updated_at
  before update on public.user_skill_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.job_postings enable row level security;
alter table public.notes enable row level security;
alter table public.user_skill_profiles enable row level security;

create policy "job_postings owner full access"
  on public.job_postings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- notes는 user_id를 따로 두지 않고 부모 공고의 소유권을 통해 검사한다.
create policy "notes owner full access"
  on public.notes
  for all
  using (
    exists (
      select 1
      from public.job_postings jp
      where jp.id = notes.job_posting_id
        and jp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.job_postings jp
      where jp.id = notes.job_posting_id
        and jp.user_id = auth.uid()
    )
  );

create policy "user_skill_profiles owner full access"
  on public.user_skill_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
