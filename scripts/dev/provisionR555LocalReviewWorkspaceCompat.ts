import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  LOCAL_DEVELOPER_REVIEW_ROLES,
  type LocalDeveloperReviewRole,
} from "../../src/lib/localDeveloperReviewRoles";

type CredentialPrincipal = {
  role: string;
  user_id: string;
};

type Credentials = {
  test_tenant_id: string;
  principals: CredentialPrincipal[];
};

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DB_CONTAINER = "supabase_db_rik-r52-a7-provider-20260824";
const EXPECTED_TENANT_ID = "55555555-5555-4555-8555-555555555551";
const COMPANY_ID = "66666666-6666-4666-8666-666666666661";
const CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const RECEIPT = resolve(
  ".release-runtime/r555/evidence/23C_R555_LOCAL_REVIEW_WORKSPACE_COMPAT.json",
);
const REPLAY_MIGRATIONS = [
  "supabase/migrations/20260323023959_backfill_director_finance_fetch_summary_v1.sql",
  "supabase/migrations/20260328111959_backfill_contractor_scope_dependencies_for_replay.sql",
  "supabase/migrations/20260329112959_backfill_request_report_dependencies_for_replay.sql",
  "supabase/migrations/20260328041959_backfill_marketplace_scope_dependencies_for_replay.sql",
  "supabase/migrations/20260328042000_marketplace_scope_page_rpc_v1.sql",
  "supabase/migrations/20260326224500_director_pending_proposals_scope_v1.sql",
  "supabase/migrations/20260330233000_identity_solidification_v1.sql",
  "supabase/migrations/20260330234500_director_canonical_fact_read_model_v1.sql",
  "supabase/migrations/20260326170000_buyer_summary_inbox_scope_v1.sql",
  "supabase/migrations/20260326193000_warehouse_stock_scope_v2.sql",
  "supabase/migrations/20260327110000_warehouse_issue_queue_scope_v4_contract_hardening.sql",
  "supabase/migrations/20260327113000_warehouse_incoming_queue_scope_v1.sql",
  "supabase/migrations/20260326121000_contractor_works_bundle_scope_v1.sql",
  "supabase/migrations/20260328112000_contractor_inbox_fact_scope_v1.sql",
] as const;

const ROLE_LABELS: Record<LocalDeveloperReviewRole, string> = {
  foreman: "Прораб",
  director: "Директор",
  buyer: "Закупщик",
  accountant: "Бухгалтер",
  warehouse: "Склад",
  contractor: "Подрядчик",
  security: "Охрана",
  estimator: "Сметчик",
  engineer: "Инженер",
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function runProviderSql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
}

function main(): void {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Credentials;
  invariant(
    credentials.test_tenant_id === EXPECTED_TENANT_ID,
    "R555_LOCAL_REVIEW_TENANT_MISMATCH",
  );
  const officePrincipals = LOCAL_DEVELOPER_REVIEW_ROLES.map((role) => {
    const principal = credentials.principals.find((entry) => entry.role === role);
    invariant(principal, `R555_LOCAL_REVIEW_PRINCIPAL_${role.toUpperCase()}_MISSING`);
    invariant(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(principal.user_id),
      `R555_LOCAL_REVIEW_PRINCIPAL_${role.toUpperCase()}_INVALID`,
    );
    return { role, userId: principal.user_id };
  });
  const director = officePrincipals.find((entry) => entry.role === "director");
  invariant(director, "R555_LOCAL_REVIEW_DIRECTOR_MISSING");

  const migrationHashes = REPLAY_MIGRATIONS.map((migration) => {
    const source = readFileSync(resolve(migration), "utf8");
    runProviderSql(source);
    return { migration, sha256: sha256(source) };
  });

  const membershipValues = officePrincipals
    .map(
      ({ role, userId }) =>
        `('${COMPANY_ID}'::uuid,'${userId}'::uuid,${sqlLiteral(role)},now())`,
    )
    .join(",\n");
  const profileValues = officePrincipals
    .map(
      ({ role, userId }) =>
        `(gen_random_uuid(),'${userId}'::uuid,${sqlLiteral(ROLE_LABELS[role])},'Бишкек')`,
    )
    .join(",\n");

  const sql = String.raw`
begin;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  name text,
  city text,
  legal_form text,
  address text,
  industry text,
  employees_count integer,
  about_short text,
  phone_main text,
  phone_whatsapp text,
  email text,
  site text,
  telegram text,
  work_time text,
  contact_person text,
  about_full text,
  services text,
  regions text,
  clients_types text,
  inn text,
  bin text,
  reg_number text,
  bank_details text,
  licenses_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (company_id,user_id)
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
  id uuid not null default gen_random_uuid(),
  user_id uuid primary key,
  full_name text,
  phone text,
  city text,
  usage_market boolean not null default false,
  usage_build boolean not null default true,
  bio text,
  telegram text,
  whatsapp text,
  position text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists legal_form text;
alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists industry text;
alter table public.companies add column if not exists employees_count integer;
alter table public.companies add column if not exists about_short text;
alter table public.companies add column if not exists phone_main text;
alter table public.companies add column if not exists phone_whatsapp text;
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists site text;
alter table public.companies add column if not exists telegram text;
alter table public.companies add column if not exists work_time text;
alter table public.companies add column if not exists contact_person text;
alter table public.companies add column if not exists about_full text;
alter table public.companies add column if not exists services text;
alter table public.companies add column if not exists regions text;
alter table public.companies add column if not exists clients_types text;
alter table public.companies add column if not exists inn text;
alter table public.companies add column if not exists bin text;
alter table public.companies add column if not exists reg_number text;
alter table public.companies add column if not exists bank_details text;
alter table public.companies add column if not exists licenses_info text;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

alter table public.company_members add column if not exists created_at timestamptz not null default now();

alter table public.user_profiles add column if not exists id uuid not null default gen_random_uuid();
alter table public.user_profiles add column if not exists phone text;
alter table public.user_profiles add column if not exists city text;
alter table public.user_profiles add column if not exists usage_market boolean not null default false;
alter table public.user_profiles add column if not exists usage_build boolean not null default true;
alter table public.user_profiles add column if not exists bio text;
alter table public.user_profiles add column if not exists telegram text;
alter table public.user_profiles add column if not exists whatsapp text;
alter table public.user_profiles add column if not exists position text;
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.user_profiles add column if not exists is_contractor boolean not null default false;

alter table public.contractors add column if not exists full_name text;

alter table public.proposals add column if not exists payment_status text;
alter table public.proposal_items add column if not exists app text;
alter table public.proposal_items add column if not exists app_code text;
alter table public.proposal_items add column if not exists buyer_fio text;
alter table public.proposal_items add column if not exists director_decided_at timestamptz;
alter table public.proposal_items add column if not exists director_decision text;
alter table public.proposal_items add column if not exists name_human text;
alter table public.proposal_items add column if not exists note text;
alter table public.proposal_items add column if not exists proposal_id_bigint bigint;
alter table public.proposal_items add column if not exists proposal_id_text text;
alter table public.proposal_items add column if not exists request_id bigint;
alter table public.proposal_items add column if not exists status text;
alter table public.proposal_items add column if not exists supplier text;
alter table public.proposal_items add column if not exists uom text;
do $proposal_fk$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.proposal_items'::regclass
      and conname='proposal_items_proposal_fk'
  ) then
    alter table public.proposal_items
      add constraint proposal_items_proposal_fk
      foreign key(proposal_id) references public.proposals(id);
  end if;
end
$proposal_fk$;

create table if not exists public.rik_apps (
  app_code text primary key,
  name_human text
);
create table if not exists public.rik_item_apps (
  app_code text,
  rik_code text,
  primary key(app_code,rik_code)
);

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  address_place_id text,
  address_text text,
  city text,
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  deadline_at timestamptz,
  delivery_days integer,
  lat numeric,
  lng numeric,
  mode text not null,
  note text,
  radius_km numeric,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  visibility text not null default 'private'
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid,
  created_at timestamptz not null default now(),
  display_no text,
  foreman_name text,
  items jsonb,
  need_by timestamptz,
  object_name text,
  request_id uuid,
  status text
);

do $incoming_view$
begin
  if to_regclass('public.v_wh_incoming_heads_ui') is null then
    execute $view$
      create view public.v_wh_incoming_heads_ui as
      select
        null::uuid as incoming_id,
        null::uuid as purchase_id,
        null::text as incoming_status,
        null::text as po_no,
        null::text as purchase_status,
        null::timestamptz as purchase_created_at,
        null::timestamptz as confirmed_at,
        0::numeric as qty_expected_sum,
        0::numeric as qty_received_sum,
        0::numeric as qty_left_sum,
        0::integer as items_cnt,
        0::integer as pending_cnt,
        0::integer as partial_cnt
      where false
    $view$;
  end if;
end
$incoming_view$;

create or replace function public.r555_is_local_review_principal()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.r551_local_developer_membership membership
    where membership.user_id = auth.uid()
      and membership.tenant_id = '${EXPECTED_TENANT_ID}'::uuid
      and membership.active
  )
$function$;

revoke all on function public.r555_is_local_review_principal() from public, anon;
grant execute on function public.r555_is_local_review_principal() to authenticated;

create or replace function public.list_director_items_stable()
returns table(
  app_code text,
  created_at timestamptz,
  item_kind text,
  name_human text,
  note text,
  qty numeric,
  request_id uuid,
  request_item_id uuid,
  rik_code text,
  uom text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select item.app_code,item.created_at,item.item_kind,item.name_human,item.note,item.qty,
         item.request_id,item.id,item.rik_code,item.uom
  from public.request_items item
  where public.r555_is_local_review_principal()
  order by item.created_at desc nulls last,item.id
$function$;

create or replace function public.acc_report_stock()
returns table(rik_code text,uom_id text,qty_on_hand numeric,qty_reserved numeric,qty_available numeric,updated_at timestamptz)
language sql stable security definer set search_path=public,pg_temp
as $function$
  select stock.rik_code,stock.uom_id,stock.qty_available,0::numeric,stock.qty_available,null::timestamptz
  from public.v_warehouse_stock stock
  where public.r555_is_local_review_principal()
$function$;

create or replace function public.acc_report_movement(p_from timestamptz default null,p_to timestamptz default null)
returns table(event_dt timestamptz,event_type text,meta jsonb,purchase_id uuid,qty numeric,rik_code text,uom_id text)
language sql stable security definer set search_path=public,pg_temp
as $function$
  select ledger.moved_at,ledger.direction,jsonb_build_object('warehouse_id',ledger.warehouse_id),ledger.purchase_id,
         ledger.qty,ledger.code,ledger.uom_id
  from public.wh_ledger ledger
  where public.r555_is_local_review_principal()
    and (p_from is null or ledger.moved_at >= p_from)
    and (p_to is null or ledger.moved_at <= p_to)
  order by ledger.moved_at,ledger.id
$function$;

create or replace function public.acc_report_issues_v2(p_from timestamptz default null,p_to timestamptz default null)
returns table(display_no text,event_dt timestamptz,issue_id bigint,issue_no text,kind text,note text,qty_in_req numeric,qty_over numeric,qty_total numeric,request_id uuid,who text)
language sql stable security definer set search_path=public,pg_temp
as $function$
  select issue.no,coalesce(issue.iss_date,issue.created_at),issue.id,issue.no,'issue',issue.note,
         issue.qty,0::numeric,issue.qty,issue.request_id,issue.who
  from public.warehouse_issues issue
  where public.r555_is_local_review_principal()
    and (p_from is null or coalesce(issue.iss_date,issue.created_at) >= p_from)
    and (p_to is null or coalesce(issue.iss_date,issue.created_at) <= p_to)
  order by coalesce(issue.iss_date,issue.created_at),issue.id
$function$;

create or replace function public.acc_report_incoming_v2(p_from timestamptz default null,p_to timestamptz default null)
returns table(display_no text,event_dt timestamptz,incoming_id uuid,note text,purchase_id uuid,qty_total numeric,who text)
language sql stable security definer set search_path=public,pg_temp
as $function$
  select ledger.incoming_id::text,ledger.moved_at,ledger.incoming_id,ledger.note,ledger.purchase_id,ledger.qty,ledger.warehouseman_fio
  from public.wh_ledger ledger
  where public.r555_is_local_review_principal()
    and ledger.direction='in'
    and ledger.incoming_id is not null
    and (p_from is null or ledger.moved_at >= p_from)
    and (p_to is null or ledger.moved_at <= p_to)
  order by ledger.moved_at,ledger.id
$function$;

revoke all on function public.list_director_items_stable() from public,anon;
revoke all on function public.acc_report_stock() from public,anon;
revoke all on function public.acc_report_movement(timestamptz,timestamptz) from public,anon;
revoke all on function public.acc_report_issues_v2(timestamptz,timestamptz) from public,anon;
revoke all on function public.acc_report_incoming_v2(timestamptz,timestamptz) from public,anon;
grant execute on function public.list_director_items_stable() to authenticated;
grant execute on function public.acc_report_stock() to authenticated;
grant execute on function public.acc_report_movement(timestamptz,timestamptz) to authenticated;
grant execute on function public.acc_report_issues_v2(timestamptz,timestamptz) to authenticated;
grant execute on function public.acc_report_incoming_v2(timestamptz,timestamptz) to authenticated;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;
alter table public.user_profiles enable row level security;
alter table public.market_listings enable row level security;
alter table public.companies force row level security;
alter table public.company_members force row level security;
alter table public.company_invites force row level security;
alter table public.user_profiles force row level security;
alter table public.market_listings force row level security;

alter table public.rik_apps enable row level security;
alter table public.rik_item_apps enable row level security;
alter table public.rik_apps force row level security;
alter table public.rik_item_apps force row level security;
drop policy if exists r555_local_review_rik_apps_select on public.rik_apps;
create policy r555_local_review_rik_apps_select on public.rik_apps
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_rik_item_apps_select on public.rik_item_apps;
create policy r555_local_review_rik_item_apps_select on public.rik_item_apps
for select to authenticated using (public.r555_is_local_review_principal());

do $rls$
declare
  table_name text;
begin
  foreach table_name in array array[
    'proposal_items','request_items','rik_items','rik_aliases','requests','purchases','purchase_items',
    'work_progress','work_progress_log','work_progress_log_materials','subcontracts','contractors','profiles',
    'objects','warehouse_issues','warehouse_issue_items','wh_ledger','proposals','proposal_payments',
    'catalog_name_overrides','warehouse_name_map_ui','tenders','auctions','request_object_identity_shadow_v1'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('alter table public.%I force row level security',table_name);
    execute format('drop policy if exists r555_local_review_select on public.%I',table_name);
    execute format(
      'create policy r555_local_review_select on public.%I for select to authenticated using (public.r555_is_local_review_principal())',
      table_name
    );
    execute format('revoke all on table public.%I from anon',table_name);
    execute format('grant select on table public.%I to authenticated',table_name);
  end loop;
end
$rls$;

drop policy if exists r555_local_review_companies_select on public.companies;
create policy r555_local_review_companies_select on public.companies
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_companies_mutate on public.companies;
create policy r555_local_review_companies_mutate on public.companies
for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists r555_local_review_company_members_select on public.company_members;
create policy r555_local_review_company_members_select on public.company_members
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_company_members_director_mutate on public.company_members;
create policy r555_local_review_company_members_director_mutate on public.company_members
for all to authenticated
using (
  company_id = '${COMPANY_ID}'::uuid
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'director'
)
with check (
  company_id = '${COMPANY_ID}'::uuid
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'director'
);

drop policy if exists r555_local_review_company_invites_select on public.company_invites;
create policy r555_local_review_company_invites_select on public.company_invites
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_company_invites_director_mutate on public.company_invites;
create policy r555_local_review_company_invites_director_mutate on public.company_invites
for all to authenticated
using (
  company_id = '${COMPANY_ID}'::uuid
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'director'
)
with check (
  company_id = '${COMPANY_ID}'::uuid
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'director'
);

drop policy if exists r555_local_review_user_profiles_select on public.user_profiles;
create policy r555_local_review_user_profiles_select on public.user_profiles
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_user_profiles_own_mutate on public.user_profiles;
create policy r555_local_review_user_profiles_own_mutate on public.user_profiles
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists r555_local_review_market_listings_select on public.market_listings;
create policy r555_local_review_market_listings_select on public.market_listings
for select to authenticated using (public.r555_is_local_review_principal());
drop policy if exists r555_local_review_market_listings_own_mutate on public.market_listings;
create policy r555_local_review_market_listings_own_mutate on public.market_listings
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select,insert,update,delete on public.companies to authenticated;
grant select,insert,update,delete on public.company_members to authenticated;
grant select,insert,update,delete on public.company_invites to authenticated;
grant select,insert,update,delete on public.user_profiles to authenticated;
grant select,insert,update,delete on public.market_listings to authenticated;
grant select on public.rik_apps to authenticated;
grant select on public.rik_item_apps to authenticated;

insert into public.companies(id,owner_user_id,name,city,industry,about_short)
values ('${COMPANY_ID}'::uuid,'${director.userId}'::uuid,'Локальная строительная компания','Бишкек','Строительство','Изолированный стенд проверки ролей')
on conflict(id) do update set
  owner_user_id=excluded.owner_user_id,
  name=excluded.name,
  city=excluded.city,
  industry=excluded.industry,
  about_short=excluded.about_short,
  updated_at=now();

insert into public.company_members(company_id,user_id,role,created_at)
values ${membershipValues}
on conflict(company_id,user_id) do update set role=excluded.role;

insert into public.user_profiles(id,user_id,full_name,city)
values ${profileValues}
on conflict(user_id) do update set full_name=excluded.full_name,city=excluded.city,updated_at=now();

notify pgrst, 'reload schema';
commit;

select json_build_object(
  'companies', (select count(*) from public.companies where id='${COMPANY_ID}'::uuid),
  'members', (select count(*) from public.company_members where company_id='${COMPANY_ID}'::uuid),
  'profiles', (select count(*) from public.user_profiles where user_id in (${officePrincipals.map((entry) => `'${entry.userId}'::uuid`).join(",")})),
  'rls_tables', (select count(*) from pg_class where oid in ('public.companies'::regclass,'public.company_members'::regclass,'public.company_invites'::regclass,'public.user_profiles'::regclass,'public.market_listings'::regclass,'public.rik_apps'::regclass,'public.rik_item_apps'::regclass) and relrowsecurity and relforcerowsecurity),
  'route_rpcs', (select count(*) from pg_proc where oid in (
    'public.list_director_items_stable()'::regprocedure,
    'public.buyer_summary_inbox_scope_v1(integer,integer,text,uuid)'::regprocedure,
    'public.warehouse_stock_scope_v2(integer,integer)'::regprocedure,
    'public.warehouse_issue_queue_scope_v4(integer,integer)'::regprocedure,
    'public.warehouse_incoming_queue_scope_v1(integer,integer)'::regprocedure,
    'public.contractor_works_bundle_scope_v1(text,boolean)'::regprocedure,
    'public.contractor_inbox_scope_v1(text,boolean)'::regprocedure,
    'public.acc_report_stock()'::regprocedure,
    'public.acc_report_movement(timestamptz,timestamptz)'::regprocedure,
    'public.acc_report_issues_v2(timestamptz,timestamptz)'::regprocedure,
    'public.acc_report_incoming_v2(timestamptz,timestamptz)'::regprocedure
  ))
)::text;
`;

  const output = runProviderSql(sql).trim().split(/\r?\n/u).at(-1) ?? "";
  const counts = JSON.parse(output) as Record<string, number>;
  const green =
    counts.companies === 1 &&
    counts.members === LOCAL_DEVELOPER_REVIEW_ROLES.length &&
    counts.profiles === LOCAL_DEVELOPER_REVIEW_ROLES.length &&
    counts.rls_tables === 7 &&
    counts.route_rpcs === 11;
  const receiptBase = {
    schema_version: "rik-expo-app-r555.local-review-workspace-compat.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: green
      ? "GREEN_R555_LOCAL_REVIEW_WORKSPACE_COMPAT"
      : "RED_R555_LOCAL_REVIEW_WORKSPACE_COMPAT",
    provider: {
      url_class: "loopback",
      container_sha256: sha256(DB_CONTAINER),
    },
    tenant: {
      id_sha256: sha256(EXPECTED_TENANT_ID),
      class: "dedicated_local_test_tenant",
    },
    company_id_sha256: sha256(COMPANY_ID),
    office_principals: officePrincipals.map(({ role, userId }) => ({
      role,
      user_id_sha256: sha256(userId),
    })),
    canonical_replay_migrations: migrationHashes,
    counts,
    security: {
      row_level_security_enabled_and_forced: counts.rls_tables === 7,
      universal_bypass: false,
      production_changed: false,
      service_key_in_client: false,
    },
    scope: {
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    },
  };
  atomicJson(RECEIPT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(
    `${JSON.stringify({ status: receiptBase.status, counts: receiptBase.counts })}\n`,
  );
  invariant(green, "R555_LOCAL_REVIEW_WORKSPACE_COMPAT_RED");
}

main();
