begin;

create table if not exists public.accounting_pay_invoice_mutations_v1 (
  client_mutation_id text primary key,
  proposal_id text not null,
  payload_hash text not null,
  request_payload jsonb not null,
  response jsonb not null,
  outcome text not null,
  payment_id integer null,
  created_at timestamptz not null default now(),
  replay_count integer not null default 0,
  last_replayed_at timestamptz null
);

create index if not exists accounting_pay_invoice_mutations_v1_proposal_id_idx
  on public.accounting_pay_invoice_mutations_v1(proposal_id);

alter table public.accounting_pay_invoice_mutations_v1 enable row level security;
revoke all on table public.accounting_pay_invoice_mutations_v1 from anon, authenticated;

comment on table public.accounting_pay_invoice_mutations_v1 is
'Idempotency ledger for accountant payment mutation. Stores committed payment outcomes by client_mutation_id for deterministic retry/replay.';

do $$
begin
  if to_regprocedure('public.accounting_pay_invoice_apply_v1(text,numeric,text,text,text,text,jsonb,text,date,numeric,text,numeric,numeric)') is null
     and to_regprocedure('public.accounting_pay_invoice_v1(text,numeric,text,text,text,text,jsonb,text,date,numeric,text,numeric,numeric)') is not null then
    alter function public.accounting_pay_invoice_v1(text,numeric,text,text,text,text,jsonb,text,date,numeric,text,numeric,numeric)
      rename to accounting_pay_invoice_apply_v1;
  end if;
end $$;

revoke execute on function public.accounting_pay_invoice_apply_v1(text,numeric,text,text,text,text,jsonb,text,date,numeric,text,numeric,numeric)
  from anon, authenticated;

create or replace function public.accounting_pay_invoice_v1(
  p_proposal_id text,
  p_amount numeric,
  p_accountant_fio text,
  p_purpose text,
  p_method text,
  p_note text default null,
  p_allocations jsonb default '[]'::jsonb,
  p_invoice_number text default null,
  p_invoice_date date default null,
  p_invoice_amount numeric default null,
  p_invoice_currency text default null,
  p_expected_total_paid numeric default null,
  p_expected_outstanding numeric default null,
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_mutation_id text := nullif(trim(coalesce(p_client_mutation_id, '')), '');
  v_proposal_id text := trim(coalesce(p_proposal_id, ''));
  v_allocations jsonb := coalesce(p_allocations, '[]'::jsonb);
  v_allocations_canonical jsonb := '[]'::jsonb;
  v_request_payload jsonb;
  v_payload_hash text;
  v_existing public.accounting_pay_invoice_mutations_v1%rowtype;
  v_response jsonb;
  v_outcome text;
  v_payment_id integer;
begin
  if v_client_mutation_id is null then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal_id,
      'failure_code', 'accounting_pay_invoice_v1_missing_client_mutation_id',
      'failure_message', 'Accountant payment requires a stable clientMutationId.',
      'outcome', 'controlled_fail'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'proposal_item_id', allocation.proposal_item_id,
        'amount', allocation.amount
      )
      order by allocation.proposal_item_id
    ),
    '[]'::jsonb
  )
  into v_allocations_canonical
  from (
    select
      nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '') as proposal_item_id,
      round(sum(coalesce((entry.value ->> 'amount')::numeric, 0)), 2)::numeric as amount
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_allocations) = 'array' then v_allocations
        else '[]'::jsonb
      end
    ) as entry(value)
    where nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '') is not null
      and coalesce((entry.value ->> 'amount')::numeric, 0) > 0
    group by nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '')
  ) allocation
  where allocation.proposal_item_id is not null
    and allocation.amount > 0;

  v_request_payload := jsonb_strip_nulls(jsonb_build_object(
    'proposal_id', v_proposal_id,
    'amount', round(coalesce(p_amount, 0)::numeric, 2),
    'accountant_fio', nullif(trim(coalesce(p_accountant_fio, '')), ''),
    'purpose', nullif(trim(coalesce(p_purpose, '')), ''),
    'method', nullif(trim(coalesce(p_method, '')), ''),
    'note', nullif(trim(coalesce(p_note, '')), ''),
    'allocations', coalesce(v_allocations_canonical, '[]'::jsonb),
    'invoice_number', nullif(trim(coalesce(p_invoice_number, '')), ''),
    'invoice_date', p_invoice_date,
    'invoice_amount', case when p_invoice_amount is null then null else round(p_invoice_amount, 2) end,
    'invoice_currency', nullif(trim(coalesce(p_invoice_currency, '')), ''),
    'expected_total_paid', case when p_expected_total_paid is null then null else round(p_expected_total_paid, 2) end,
    'expected_outstanding', case when p_expected_outstanding is null then null else round(p_expected_outstanding, 2) end
  ));
  v_payload_hash := md5(v_request_payload::text);

  perform pg_advisory_xact_lock(hashtext('accounting_pay_invoice_v1:' || v_client_mutation_id));

  select *
  into v_existing
  from public.accounting_pay_invoice_mutations_v1
  where client_mutation_id = v_client_mutation_id;

  if found then
    if v_existing.payload_hash <> v_payload_hash then
      return jsonb_build_object(
        'ok', false,
        'operation', 'accounting_pay_invoice_v1',
        'proposal_id', v_proposal_id,
        'client_mutation_id', v_client_mutation_id,
        'failure_code', 'accounting_pay_invoice_v1_idempotency_conflict',
        'failure_message', 'clientMutationId was reused with a different accountant payment payload.',
        'outcome', 'idempotency_conflict',
        'idempotent_replay', false
      );
    end if;

    update public.accounting_pay_invoice_mutations_v1
    set
      replay_count = replay_count + 1,
      last_replayed_at = now()
    where client_mutation_id = v_client_mutation_id;

    return v_existing.response || jsonb_build_object(
      'client_mutation_id', v_client_mutation_id,
      'idempotent_replay', true,
      'outcome', 'idempotent_replay',
      'original_outcome', v_existing.outcome
    );
  end if;

  v_response := public.accounting_pay_invoice_apply_v1(
    p_proposal_id => p_proposal_id,
    p_amount => p_amount,
    p_accountant_fio => p_accountant_fio,
    p_purpose => p_purpose,
    p_method => p_method,
    p_note => p_note,
    p_allocations => p_allocations,
    p_invoice_number => p_invoice_number,
    p_invoice_date => p_invoice_date,
    p_invoice_amount => p_invoice_amount,
    p_invoice_currency => p_invoice_currency,
    p_expected_total_paid => p_expected_total_paid,
    p_expected_outstanding => p_expected_outstanding
  );

  v_outcome := case
    when coalesce((v_response ->> 'ok')::boolean, false) then 'success'
    else 'controlled_fail'
  end;
  v_payment_id := nullif(trim(coalesce(v_response ->> 'payment_id', '')), '')::integer;
  v_response := v_response || jsonb_build_object(
    'client_mutation_id', v_client_mutation_id,
    'idempotent_replay', false,
    'outcome', v_outcome
  );

  insert into public.accounting_pay_invoice_mutations_v1 (
    client_mutation_id,
    proposal_id,
    payload_hash,
    request_payload,
    response,
    outcome,
    payment_id
  )
  values (
    v_client_mutation_id,
    v_proposal_id,
    v_payload_hash,
    v_request_payload,
    v_response,
    v_outcome,
    v_payment_id
  );

  return v_response;
end;
$$;

comment on function public.accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric, text) is
'Deterministic idempotent accountant payment boundary. Requires client_mutation_id, replays exact same payload without a second payment, and returns typed idempotency conflict for key reuse with different payload.';

grant execute on function public.accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric, text) to authenticated;

commit;
