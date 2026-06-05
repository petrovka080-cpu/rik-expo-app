begin;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text,
  owner_user_id uuid
);

alter table if exists public.companies
  add column if not exists owner_user_id uuid;

create table if not exists public.company_members (
  company_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamptz,
  primary key (company_id, user_id)
);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invite_code text not null,
  name text not null,
  phone text not null,
  role text not null,
  status text not null default 'pending',
  email text,
  comment text,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key,
  full_name text
);

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  user_id uuid,
  company_id uuid,
  city text,
  price numeric,
  kind text,
  side text,
  description text,
  contacts_phone text,
  contacts_whatsapp text,
  contacts_email text,
  items_json jsonb,
  uom text,
  uom_code text,
  rik_code text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
);

do $$
begin
  if to_regclass('public.v_catalog_marketplace') is null then
    execute $view$
      create view public.v_catalog_marketplace as
      select
        null::text as source_code,
        null::text as canon_code,
        null::text as name_human,
        null::text as name_human_ru,
        null::text as uom_code,
        null::text as kind
      where false;
    $view$;
  end if;

  if to_regclass('public.v_marketplace_catalog_stock') is null then
    execute $view$
      create view public.v_marketplace_catalog_stock as
      select
        null::text as code,
        0::numeric as qty_available,
        null::text as uom_code
      where false;
    $view$;
  end if;
end;
$$;

comment on table public.market_listings is
'Compatibility empty marketplace listings table for local replayability when remote history placeholders did not recreate the original marketplace tables. Created only when absent.';

comment on table public.company_members is
'Compatibility company membership table for local replayability when remote history placeholders did not recreate the original company membership table. Created only when absent and without seed data.';

comment on table public.company_invites is
'Compatibility company invites table for local replayability when remote history placeholders did not recreate the original invite table. Created only when absent and without seed data.';

comment on view public.v_catalog_marketplace is
'Compatibility empty catalog marketplace view for local replayability when remote history placeholders did not recreate the original marketplace catalog read view. Created only when absent.';

comment on view public.v_marketplace_catalog_stock is
'Compatibility empty marketplace stock view for local replayability when remote history placeholders did not recreate the original marketplace stock read view. Created only when absent.';

commit;
