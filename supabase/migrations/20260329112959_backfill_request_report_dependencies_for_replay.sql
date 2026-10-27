begin;

do $$
begin
  if to_regtype('public.request_status_enum') is null then
    execute $type$
      create type public.request_status_enum as enum (
        U&'\0427\0435\0440\043D\043E\0432\0438\043A',
        U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438',
        U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E',
        U&'\041E\0442\043A\043B\043E\043D\0435\043D\043E',
        U&'\0412 \0440\0430\0431\043E\0442\0435 \0441\043A\043B\0430\0434\0430',
        U&'\0413\043E\0442\043E\0432\043E',
        U&'\0417\0430\043A\0440\044B\0442',
        U&'\0423\0434\0430\043B\0451\043D',
        'pending',
        U&'\041D\0430 \0434\043E\0440\0430\0431\043E\0442\043A\0435',
        U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\0430',
        U&'\041A \0437\0430\043A\0443\043F\043A\0435'
      );
    $type$;
  end if;
end;
$$;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  status text,
  supplier text,
  buyer_fio text,
  proposal_no text,
  id_short bigint,
  display_no text,
  doc_no text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  submitted_at timestamptz,
  sent_to_accountant_at timestamptz,
  approved_at timestamptz
);

create table if not exists public.proposal_payments (
  id bigint generated always as identity primary key,
  proposal_id uuid,
  amount numeric,
  paid_at timestamptz,
  created_at timestamptz,
  created_by uuid,
  currency text,
  method text,
  note text,
  purpose text
);

alter table if exists public.proposals
  add column if not exists id_short bigint,
  add column if not exists sent_to_accountant_at timestamptz,
  add column if not exists buyer_fio text;

alter table if exists public.requests
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz;

do $$
begin
  if to_regclass('public.requests') is not null
    and to_regtype('public.request_status_enum') is not null
    and exists (
      select 1
      from pg_attribute
      where attrelid = 'public.requests'::regclass
        and attname = 'status'
        and not attisdropped
        and atttypid <> 'public.request_status_enum'::regtype
    )
  then
    execute 'alter table public.requests alter column status type public.request_status_enum using nullif(status::text, '''')::public.request_status_enum';
  end if;
end;
$$;

alter table if exists public.proposal_items
  add column if not exists price numeric,
  add column if not exists qty numeric,
  add column if not exists total_qty numeric,
  add column if not exists rik_code text,
  add column if not exists director_comment text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.purchase_items
  add column if not exists qty numeric,
  add column if not exists ref_id text;

alter table if exists public.ref_systems
  add column if not exists alias_ru text;

create table if not exists public.catalog_name_overrides (
  code text,
  name_ru text
);

create table if not exists public.warehouse_name_map_ui (
  code text primary key,
  display_name text,
  updated_at timestamptz
);

do $$
begin
  if to_regclass('public.v_wh_balance_ledger_ui') is null then
    execute $view$
      create view public.v_wh_balance_ledger_ui as
      select
        null::text as code,
        null::text as name,
        null::text as name_ru,
        null::timestamptz as updated_at
      where false;
    $view$;
  end if;

  if to_regclass('public.v_wh_balance_ledger_truth_ui') is null then
    execute $view$
      create view public.v_wh_balance_ledger_truth_ui as
      select
        null::text as code,
        null::text as uom_id,
        0::numeric as qty_available,
        null::timestamptz as updated_at
      where false;
    $view$;
  end if;

  if to_regclass('public.v_rik_names_ru') is null then
    execute $view$
      create view public.v_rik_names_ru as
      select
        null::text as code,
        null::text as name_ru
      where false;
    $view$;
  end if;

  if to_regclass('public.proposal_items_view') is null then
    execute $view$
      create view public.proposal_items_view as
      select
        null::bigint as id,
        null::uuid as proposal_id,
        null::uuid as request_item_id,
        null::text as rik_code,
        null::text as name_human,
        null::text as uom,
        0::numeric as total_qty,
        0::numeric as price,
        null::text as supplier,
        null::text as app_code,
        null::text as note
      where false;
    $view$;
  end if;

  if to_regclass('public.v_proposals_summary') is null then
    execute $view$
      create view public.v_proposals_summary as
      select
        nullif(trim(coalesce(p.buyer_fio, '')), '')::text as buyer_fio,
        count(pi.id)::bigint as items_cnt,
        p.id as proposal_id,
        p.sent_to_accountant_at as sent_to_accountant_at,
        nullif(trim(coalesce(p.status, '')), '')::text as status,
        p.submitted_at as submitted_at,
        coalesce(sum(coalesce(pi.price, 0) * coalesce(pi.total_qty, pi.qty, 0)), 0)::numeric as total_sum
      from public.proposals p
      left join public.proposal_items pi
        on pi.proposal_id::text = p.id::text
      group by
        p.id,
        p.buyer_fio,
        p.sent_to_accountant_at,
        p.status,
        p.submitted_at;
    $view$;
  end if;
end;
$$;

comment on table public.proposals is
'Compatibility empty proposals table for local replayability when remote history placeholders did not recreate the original proposal lifecycle tables. Created only when absent.';

comment on table public.proposal_payments is
'Compatibility empty proposal payments table for local replayability when remote history placeholders did not recreate the original payment lineage table. Created only when absent.';

comment on view public.v_proposals_summary is
'Compatibility proposal summary view for local replayability when remote history placeholders did not recreate the original buyer proposal summary read model. Created only when absent and shaped to the typed v_proposals_summary contract.';

commit;
