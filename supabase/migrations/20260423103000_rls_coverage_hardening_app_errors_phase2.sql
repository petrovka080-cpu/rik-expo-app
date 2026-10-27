begin;

create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  context text,
  message text,
  extra jsonb null,
  platform text,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.app_errors is
  'Insert-only application error sink. Clients may write redacted diagnostics; direct reads and mutations stay closed to anon/authenticated roles.';

alter table public.app_errors
  add column if not exists context text,
  add column if not exists message text,
  add column if not exists extra jsonb,
  add column if not exists platform text,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists created_at timestamptz default now();

alter table public.app_errors
  alter column created_by set default auth.uid(),
  alter column created_at set default now();

create index if not exists ix_app_errors_created_at
  on public.app_errors(created_at desc);

create index if not exists ix_app_errors_context_created_at
  on public.app_errors(context, created_at desc);

alter table public.app_errors enable row level security;

revoke all on table public.app_errors from anon;
revoke all on table public.app_errors from authenticated;
grant insert on table public.app_errors to anon, authenticated;

drop policy if exists app_errors_insert_redacted_sink on public.app_errors;
create policy app_errors_insert_redacted_sink
  on public.app_errors
  for insert
  to anon, authenticated
  with check (
    created_by is not distinct from auth.uid()
    and length(btrim(coalesce(context, ''))) between 1 and 200
    and length(btrim(coalesce(message, ''))) between 1 and 4000
    and coalesce(platform, '') in ('ios', 'android', 'web', 'windows', 'macos')
  );

commit;
