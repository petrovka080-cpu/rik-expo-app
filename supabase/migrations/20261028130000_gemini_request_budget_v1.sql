-- Server-owned request admission for the legacy paid Gemini function.
-- Limits count attempts, not currency. Adjust only with privileged server access.
create table if not exists public.gemini_request_policy_v1 (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  user_per_minute integer check (user_per_minute > 0),
  user_per_day integer check (user_per_day > 0),
  global_per_minute integer check (global_per_minute > 0),
  global_per_day integer check (global_per_day > 0),
  -- No invented provider quota: enable only after privileged configuration of real limits.
  check (not enabled or (user_per_minute is not null and user_per_day is not null
    and global_per_minute is not null and global_per_day is not null))
);
insert into public.gemini_request_policy_v1(singleton) values (true) on conflict do nothing;

create table if not exists public.gemini_request_usage_v1 (
  subject text primary key,
  minute_start timestamptz not null,
  minute_count integer not null default 0 check (minute_count >= 0),
  day_start timestamptz not null,
  day_count integer not null default 0 check (day_count >= 0)
);
alter table public.gemini_request_policy_v1 enable row level security;
alter table public.gemini_request_usage_v1 enable row level security;
revoke all on public.gemini_request_policy_v1, public.gemini_request_usage_v1 from public, anon, authenticated;
grant all on public.gemini_request_policy_v1, public.gemini_request_usage_v1 to service_role;

create or replace function public.admit_gemini_request_v1()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  stamp timestamptz := now();
  minute_bucket timestamptz := date_trunc('minute', stamp);
  day_bucket timestamptz := date_trunc('day', stamp at time zone 'UTC') at time zone 'UTC';
  policy public.gemini_request_policy_v1%rowtype;
  total public.gemini_request_usage_v1%rowtype;
  personal public.gemini_request_usage_v1%rowtype;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into policy from public.gemini_request_policy_v1 where singleton;
  if not found or not policy.enabled then return jsonb_build_object('allowed', false); end if;
  -- Always lock global before personal. One stable row per account, not one per event/window.
  insert into public.gemini_request_usage_v1(subject, minute_start, day_start)
    values ('*', minute_bucket, day_bucket) on conflict do nothing;
  select * into total from public.gemini_request_usage_v1 where subject = '*' for update;
  if total.minute_start <> minute_bucket then total.minute_start := minute_bucket; total.minute_count := 0; end if;
  if total.day_start <> day_bucket then total.day_start := day_bucket; total.day_count := 0; end if;
  if total.minute_count >= policy.global_per_minute or total.day_count >= policy.global_per_day then
    return jsonb_build_object('allowed', false);
  end if;
  insert into public.gemini_request_usage_v1(subject, minute_start, day_start)
    values (actor::text, minute_bucket, day_bucket) on conflict do nothing;
  select * into personal from public.gemini_request_usage_v1 where subject = actor::text for update;
  if personal.minute_start <> minute_bucket then personal.minute_start := minute_bucket; personal.minute_count := 0; end if;
  if personal.day_start <> day_bucket then personal.day_start := day_bucket; personal.day_count := 0; end if;
  if personal.minute_count >= policy.user_per_minute or personal.day_count >= policy.user_per_day then
    return jsonb_build_object('allowed', false);
  end if;
  update public.gemini_request_usage_v1 set minute_start = minute_bucket, minute_count = total.minute_count + 1,
    day_start = day_bucket, day_count = total.day_count + 1 where subject = '*';
  update public.gemini_request_usage_v1 set minute_start = minute_bucket, minute_count = personal.minute_count + 1,
    day_start = day_bucket, day_count = personal.day_count + 1 where subject = actor::text;
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.admit_gemini_request_v1() from public, anon;
grant execute on function public.admit_gemini_request_v1() to authenticated;
