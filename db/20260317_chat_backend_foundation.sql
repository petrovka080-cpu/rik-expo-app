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
  'Marketplace and internal chat messages. supplier_id is used as a conversation key for supplier/listing chats.';
comment on column public.chat_messages.supplier_id is
  'Conversation key for supplier or listing chat. In the current app this stores market_listings.id, not auth.users.id.';

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

alter table public.chat_messages enable row level security;
grant select, insert, update, delete on public.chat_messages to authenticated;

drop policy if exists chat_messages_select_authenticated on public.chat_messages;
create policy chat_messages_select_authenticated
on public.chat_messages
for select
to authenticated
using (auth.role() = 'authenticated');

drop policy if exists chat_messages_insert_authenticated on public.chat_messages;
create policy chat_messages_insert_authenticated
on public.chat_messages
for insert
to authenticated
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

drop policy if exists chat_messages_update_authenticated on public.chat_messages;
create policy chat_messages_update_authenticated
on public.chat_messages
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create table if not exists public.chat_typing (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete set null,
  object_id uuid null,
  supplier_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chat_typing_scope
  on public.chat_typing(
    user_id,
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(object_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists idx_chat_typing_updated_at
  on public.chat_typing(updated_at desc);

alter table public.chat_typing enable row level security;
grant select, insert, update, delete on public.chat_typing to authenticated;

drop policy if exists chat_typing_select_authenticated on public.chat_typing;
create policy chat_typing_select_authenticated
on public.chat_typing
for select
to authenticated
using (auth.role() = 'authenticated');

drop policy if exists chat_typing_insert_authenticated on public.chat_typing;
create policy chat_typing_insert_authenticated
on public.chat_typing
for insert
to authenticated
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

drop policy if exists chat_typing_update_authenticated on public.chat_typing;
create policy chat_typing_update_authenticated
on public.chat_typing
for update
to authenticated
using (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
)
with check (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

drop policy if exists chat_typing_delete_authenticated on public.chat_typing;
create policy chat_typing_delete_authenticated
on public.chat_typing
for delete
to authenticated
using (
  auth.role() = 'authenticated'
  and auth.uid() = user_id
);

insert into storage.buckets (id, name, public)
values ('chat_media', 'chat_media', true)
on conflict (id) do update
set public = excluded.public,
    name = excluded.name;

grant select, insert, update, delete on table storage.objects to authenticated;

drop policy if exists chat_media_select_authenticated on storage.objects;
create policy chat_media_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'chat_media');

drop policy if exists chat_media_insert_authenticated on storage.objects;
create policy chat_media_insert_authenticated
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat_media');

drop policy if exists chat_media_update_authenticated on storage.objects;
create policy chat_media_update_authenticated
on storage.objects
for update
to authenticated
using (bucket_id = 'chat_media')
with check (bucket_id = 'chat_media');

drop policy if exists chat_media_delete_authenticated on storage.objects;
create policy chat_media_delete_authenticated
on storage.objects
for delete
to authenticated
using (bucket_id = 'chat_media');

commit;
