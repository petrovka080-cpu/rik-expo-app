begin;

create table if not exists public.ai_configs (
  id text primary key,
  content text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.ai_configs is
  'Authenticated read-only AI prompt/config lookup. Direct client writes stay closed; service/admin paths may seed and update prompts out of band.';

alter table public.ai_configs
  add column if not exists content text,
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz default now();

alter table public.ai_configs
  alter column content set not null,
  alter column is_active set default true,
  alter column updated_at set default now();

create index if not exists ix_ai_configs_active_updated_at
  on public.ai_configs(is_active, updated_at desc);

alter table public.ai_configs enable row level security;

revoke all on table public.ai_configs from anon;
revoke all on table public.ai_configs from authenticated;
grant select on table public.ai_configs to authenticated;

drop policy if exists ai_configs_select_active_authenticated on public.ai_configs;
create policy ai_configs_select_active_authenticated
  on public.ai_configs
  for select
  to authenticated
  using (is_active is true);

create table if not exists public.ai_reports (
  id text primary key,
  company_id uuid null,
  user_id uuid null,
  role text null,
  context text null,
  title text null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_reports is
  'Authenticated AI report sink. Direct clients may upsert only their own rows, optionally scoped to a company they belong to; direct reads and deletes stay closed.';

alter table public.ai_reports
  add column if not exists company_id uuid,
  add column if not exists user_id uuid,
  add column if not exists role text,
  add column if not exists context text,
  add column if not exists title text,
  add column if not exists content text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.ai_reports
  alter column content set not null,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

create index if not exists ix_ai_reports_user_updated_at
  on public.ai_reports(user_id, updated_at desc);

create index if not exists ix_ai_reports_company_updated_at
  on public.ai_reports(company_id, updated_at desc);

alter table public.ai_reports enable row level security;

revoke all on table public.ai_reports from anon;
revoke all on table public.ai_reports from authenticated;
grant insert, update on table public.ai_reports to authenticated;

drop policy if exists ai_reports_insert_authenticated_own on public.ai_reports;
create policy ai_reports_insert_authenticated_own
  on public.ai_reports
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and length(btrim(coalesce(id, ''))) between 1 and 200
    and length(btrim(coalesce(content, ''))) between 1 and 12000
    and (
      company_id is null
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = ai_reports.company_id
          and cm.user_id = auth.uid()
      )
    )
  );

drop policy if exists ai_reports_update_authenticated_own on public.ai_reports;
create policy ai_reports_update_authenticated_own
  on public.ai_reports
  for update
  to authenticated
  using (
    auth.uid() is not null
    and user_id = auth.uid()
  )
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and length(btrim(coalesce(id, ''))) between 1 and 200
    and length(btrim(coalesce(content, ''))) between 1 and 12000
    and (
      company_id is null
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = ai_reports.company_id
          and cm.user_id = auth.uid()
      )
    )
  );

commit;
