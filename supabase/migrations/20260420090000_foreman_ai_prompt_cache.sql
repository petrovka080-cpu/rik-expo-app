begin;

create table if not exists public.foreman_ai_prompt_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.foreman_ai_prompt_cache is
  'Short-lived server-side prompt cache for the foreman AI catalog resolve Edge boundary.';

create index if not exists foreman_ai_prompt_cache_expires_at_idx
  on public.foreman_ai_prompt_cache (expires_at);

alter table public.foreman_ai_prompt_cache enable row level security;

revoke all on table public.foreman_ai_prompt_cache from anon;
revoke all on table public.foreman_ai_prompt_cache from authenticated;

commit;
