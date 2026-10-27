begin;

create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete set null,
  object_id uuid null,
  supplier_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text'
    check (message_type in ('text', 'photo', 'voice', 'file', 'system')),
  content text null,
  mentions text[] not null default '{}'::text[],
  media_url text null,
  media_thumbnail text null,
  media_duration integer null,
  read_by text[] not null default '{}'::text[],
  reply_to_id uuid null references public.chat_messages(id) on delete set null,
  reactions jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  pinned_at timestamptz null,
  pinned_by uuid null references auth.users(id) on delete set null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is
  'Marketplace listing chat messages. Current app behavior is an authenticated listing-thread chat keyed by market_listings.id in supplier_id.';

comment on column public.chat_messages.supplier_id is
  'Conversation key for listing chat. In the current app this stores public.market_listings.id.';

create index if not exists idx_chat_messages_created_at
  on public.chat_messages(created_at desc);

create index if not exists idx_chat_messages_company_created
  on public.chat_messages(company_id, created_at desc);

create index if not exists idx_chat_messages_object_created
  on public.chat_messages(object_id, created_at desc);

create index if not exists idx_chat_messages_supplier_created
  on public.chat_messages(supplier_id, created_at desc);

create index if not exists idx_chat_messages_user_created
  on public.chat_messages(user_id, created_at desc);

create or replace function public.chat_messages_actor_can_claim_company_v1(p_company_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    p_company_id is null
    or exists (
      select 1
      from public.companies c
      where c.id = p_company_id
        and c.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
    );
$$;

revoke all on function public.chat_messages_actor_can_claim_company_v1(uuid) from public;
grant execute on function public.chat_messages_actor_can_claim_company_v1(uuid) to authenticated, service_role;

create or replace function public.chat_messages_listing_visible_v1(p_supplier_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    p_supplier_id is not null
    and exists (
      select 1
      from public.market_listings ml
      where ml.id = p_supplier_id
    );
$$;

revoke all on function public.chat_messages_listing_visible_v1(uuid) from public;
grant execute on function public.chat_messages_listing_visible_v1(uuid) to authenticated, service_role;

create or replace function public.chat_messages_non_author_read_by_guard_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'chat_messages update requires authenticated actor';
  end if;

  if old.user_id = auth.uid() then
    return new;
  end if;

  if new.is_deleted is distinct from old.is_deleted then
    raise exception 'chat_messages non-author update may not change is_deleted';
  end if;

  if new.read_by is null then
    raise exception 'chat_messages non-author update must keep read_by non-null';
  end if;

  if not (new.read_by @> old.read_by) then
    raise exception 'chat_messages non-author update may only append read receipts';
  end if;

  if array_position(new.read_by, auth.uid()::text) is null then
    raise exception 'chat_messages non-author update must include actor read receipt';
  end if;

  return new;
end;
$$;

revoke all on function public.chat_messages_non_author_read_by_guard_v1() from public;
grant execute on function public.chat_messages_non_author_read_by_guard_v1() to authenticated, service_role;

drop trigger if exists trg_chat_messages_non_author_read_by_guard_v1 on public.chat_messages;
create trigger trg_chat_messages_non_author_read_by_guard_v1
before update on public.chat_messages
for each row
execute function public.chat_messages_non_author_read_by_guard_v1();

alter table public.chat_messages enable row level security;

revoke all on table public.chat_messages from anon;
revoke all on table public.chat_messages from authenticated;
grant select, insert on table public.chat_messages to authenticated;
grant update (read_by, is_deleted) on table public.chat_messages to authenticated;

drop policy if exists chat_messages_select_authenticated_listing_scope on public.chat_messages;
create policy chat_messages_select_authenticated_listing_scope
on public.chat_messages
for select
to authenticated
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.chat_messages_listing_visible_v1(supplier_id)
  )
);

drop policy if exists chat_messages_insert_authenticated_own on public.chat_messages;
create policy chat_messages_insert_authenticated_own
on public.chat_messages
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.chat_messages_actor_can_claim_company_v1(company_id)
  and (
    supplier_id is null
    or public.chat_messages_listing_visible_v1(supplier_id)
  )
  and (
    message_type <> 'text'
    or length(btrim(coalesce(content, ''))) between 1 and 4000
  )
);

drop policy if exists chat_messages_update_author_authenticated on public.chat_messages;
create policy chat_messages_update_author_authenticated
on public.chat_messages
for update
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.chat_messages_actor_can_claim_company_v1(company_id)
  and (
    supplier_id is null
    or public.chat_messages_listing_visible_v1(supplier_id)
  )
);

drop policy if exists chat_messages_update_read_receipt_authenticated on public.chat_messages;
create policy chat_messages_update_read_receipt_authenticated
on public.chat_messages
for update
to authenticated
using (
  auth.uid() is not null
  and user_id <> auth.uid()
  and public.chat_messages_listing_visible_v1(supplier_id)
)
with check (
  auth.uid() is not null
  and user_id <> auth.uid()
  and public.chat_messages_listing_visible_v1(supplier_id)
  and array_position(read_by, auth.uid()::text) is not null
);

commit;
