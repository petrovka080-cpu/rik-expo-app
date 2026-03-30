begin;

create or replace function public.accountant_proposal_financial_totals_v1(
  p_proposal_id text
)
returns table (
  proposal_id text,
  proposal_status text,
  sent_to_accountant_at timestamptz,
  supplier text,
  invoice_number text,
  invoice_date date,
  invoice_currency text,
  payable_amount numeric,
  total_paid numeric,
  outstanding_amount numeric,
  payments_count integer,
  approved boolean,
  sent_to_accountant boolean,
  payment_eligible boolean,
  payment_status text,
  failure_code text,
  last_paid_at timestamptz,
  legacy_total_paid numeric,
  legacy_payment_status text,
  payable_source text
)
language sql
stable
security definer
set search_path = public
as $$
with proposal_row as (
  select p.*
  from public.proposals p
  where p.id::text = trim(coalesce(p_proposal_id, ''))
),
invoice_row as (
  select
    pr.id::text as proposal_id,
    nullif(trim(coalesce(ai.invoice_number, '')), '') as invoice_number,
    ai.invoice_date,
    nullif(trim(coalesce(ai.invoice_currency, '')), '') as invoice_currency,
    ai.invoice_amount
  from proposal_row pr
  left join lateral (
    select
      inv.invoice_number,
      inv.invoice_date,
      inv.invoice_currency,
      inv.invoice_amount
    from public.accounting_invoices inv
    where inv.proposal_id::text = pr.id::text
    order by inv.created_at desc, inv.id desc
    limit 1
  ) ai on true
),
items_total as (
  select
    pr.id::text as proposal_id,
    coalesce(sum(coalesce(pi.qty, 0) * coalesce(pi.price, 0)), 0)::numeric as items_total
  from proposal_row pr
  left join public.proposal_items pi
    on pi.proposal_id::text = pr.id::text
  group by pr.id::text
),
payments_total as (
  select
    pr.id::text as proposal_id,
    coalesce(sum(pp.amount), 0)::numeric as total_paid,
    count(pp.id)::integer as payments_count,
    max(coalesce(pp.paid_at, pp.created_at)) as last_paid_at
  from proposal_row pr
  left join public.proposal_payments pp
    on pp.proposal_id::text = pr.id::text
  group by pr.id::text
),
base as (
  select
    pr.id::text as proposal_id,
    pr.status::text as proposal_status,
    pr.sent_to_accountant_at,
    nullif(trim(coalesce(pr.supplier, '')), '') as supplier,
    coalesce(ir.invoice_number, nullif(trim(coalesce(pr.invoice_number, '')), '')) as invoice_number,
    coalesce(ir.invoice_date, pr.invoice_date) as invoice_date,
    coalesce(ir.invoice_currency, nullif(trim(coalesce(pr.invoice_currency, '')), ''), 'KGS') as invoice_currency,
    greatest(
      coalesce(ir.invoice_amount, pr.invoice_amount, it.items_total, 0),
      0
    )::numeric as payable_amount,
    coalesce(pt.total_paid, 0)::numeric as total_paid,
    coalesce(pt.payments_count, 0)::integer as payments_count,
    pt.last_paid_at,
    coalesce(pr.total_paid, 0)::numeric as legacy_total_paid,
    nullif(trim(coalesce(pr.payment_status, '')), '') as legacy_payment_status,
    case
      when ir.invoice_amount is not null then 'accounting_invoices'
      when pr.invoice_amount is not null then 'proposals.invoice_amount'
      when coalesce(it.items_total, 0) > 0 then 'proposal_items_total'
      else 'zero'
    end as payable_source
  from proposal_row pr
  left join invoice_row ir
    on ir.proposal_id = pr.id::text
  left join items_total it
    on it.proposal_id = pr.id::text
  left join payments_total pt
    on pt.proposal_id = pr.id::text
)
select
  b.proposal_id,
  b.proposal_status,
  b.sent_to_accountant_at,
  b.supplier,
  b.invoice_number,
  b.invoice_date,
  b.invoice_currency,
  b.payable_amount,
  b.total_paid,
  greatest(b.payable_amount - b.total_paid, 0)::numeric as outstanding_amount,
  b.payments_count,
  lower(trim(coalesce(b.proposal_status, ''))) in ('утверждено', 'утверждена', 'approved') as approved,
  b.sent_to_accountant_at is not null as sent_to_accountant,
  (
    lower(trim(coalesce(b.proposal_status, ''))) in ('утверждено', 'утверждена', 'approved')
    and b.sent_to_accountant_at is not null
    and b.payable_amount > 0
    and greatest(b.payable_amount - b.total_paid, 0) > 0.01
  ) as payment_eligible,
  case
    when b.total_paid <= 0.01 then 'К оплате'
    when greatest(b.payable_amount - b.total_paid, 0) > 0.01 then 'Частично оплачено'
    else 'Оплачено'
  end as payment_status,
  case
    when b.sent_to_accountant_at is null then
      case
        when lower(trim(coalesce(b.proposal_status, ''))) in ('утверждено', 'утверждена', 'approved')
          then 'approval_revoked'
        else 'proposal_not_approved'
      end
    when lower(trim(coalesce(b.proposal_status, ''))) not in ('утверждено', 'утверждена', 'approved')
      then 'proposal_not_approved'
    when b.payable_amount <= 0 then 'invalid_payable_amount'
    when greatest(b.payable_amount - b.total_paid, 0) <= 0.01 then 'already_paid'
    else null
  end as failure_code,
  b.last_paid_at,
  b.legacy_total_paid,
  b.legacy_payment_status,
  b.payable_source
from base b;
$$;

comment on function public.accountant_proposal_financial_totals_v1(text) is
'Canonical server-owned totals for accountant payment flow. Computes payable, paid, outstanding and payment eligibility from DB truth.';

create or replace function public.accountant_proposal_financial_state_v1(
  p_proposal_id text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with totals as (
  select *
  from public.accountant_proposal_financial_totals_v1(p_proposal_id)
),
item_paid as (
  select
    ppa.proposal_item_id::text as proposal_item_id,
    coalesce(sum(ppa.amount), 0)::numeric as paid_total
  from public.proposal_payment_allocations ppa
  join public.proposal_payments pp
    on pp.id = ppa.payment_id
  where pp.proposal_id::text in (select t.proposal_id from totals t)
  group by ppa.proposal_item_id::text
),
item_rows as (
  select
    pi.id::text as proposal_item_id,
    nullif(trim(coalesce(pi.name_human, '')), '') as name_human,
    nullif(trim(coalesce(pi.uom, '')), '') as uom,
    coalesce(pi.qty, 0)::numeric as qty,
    coalesce(pi.price, 0)::numeric as price,
    nullif(trim(coalesce(pi.rik_code, '')), '') as rik_code,
    round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2) as line_total,
    least(
      round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2),
      round(coalesce(ip.paid_total, 0), 2)
    )::numeric as paid_total,
    greatest(
      round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2)
      - least(
        round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2),
        round(coalesce(ip.paid_total, 0), 2)
      ),
      0
    )::numeric as outstanding
  from public.proposal_items pi
  join totals t
    on t.proposal_id = pi.proposal_id::text
  left join item_paid ip
    on ip.proposal_item_id = pi.id::text
  order by pi.id asc
),
item_summary as (
  select
    coalesce(sum(ir.paid_total), 0)::numeric as paid_known_sum
  from item_rows ir
)
select coalesce(
  (
    select jsonb_build_object(
      'document_type', 'accountant_proposal_financial_state',
      'version', 'v1',
      'proposal', jsonb_build_object(
        'proposal_id', t.proposal_id,
        'status', t.proposal_status,
        'sent_to_accountant_at', t.sent_to_accountant_at,
        'supplier', t.supplier
      ),
      'invoice', jsonb_build_object(
        'invoice_number', t.invoice_number,
        'invoice_date', t.invoice_date,
        'invoice_currency', t.invoice_currency,
        'payable_source', t.payable_source
      ),
      'totals', jsonb_build_object(
        'payable_amount', t.payable_amount,
        'total_paid', t.total_paid,
        'outstanding_amount', t.outstanding_amount,
        'payments_count', t.payments_count,
        'payment_status', t.payment_status,
        'last_paid_at', t.last_paid_at
      ),
      'eligibility', jsonb_build_object(
        'approved', t.approved,
        'sent_to_accountant', t.sent_to_accountant,
        'payment_eligible', t.payment_eligible,
        'failure_code', t.failure_code
      ),
      'allocation_summary', jsonb_build_object(
        'paid_known_sum', coalesce((select s.paid_known_sum from item_summary s), 0),
        'paid_unassigned', greatest(
          t.total_paid - coalesce((select s.paid_known_sum from item_summary s), 0),
          0
        ),
        'allocation_count', coalesce((select count(*)::integer from item_rows), 0)
      ),
      'items', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'proposal_item_id', ir.proposal_item_id,
              'name_human', ir.name_human,
              'uom', ir.uom,
              'qty', ir.qty,
              'price', ir.price,
              'rik_code', ir.rik_code,
              'line_total', ir.line_total,
              'paid_total', ir.paid_total,
              'outstanding', ir.outstanding
            )
            order by ir.proposal_item_id
          )
          from item_rows ir
        ),
        '[]'::jsonb
      ),
      'meta', jsonb_build_object(
        'source_kind', 'rpc:accountant_proposal_financial_state_v1',
        'backend_truth', true,
        'legacy_total_paid', t.legacy_total_paid,
        'legacy_payment_status', t.legacy_payment_status
      )
    )
    from totals t
  ),
  jsonb_build_object(
    'document_type', 'accountant_proposal_financial_state',
    'version', 'v1',
    'proposal', jsonb_build_object('proposal_id', trim(coalesce(p_proposal_id, ''))),
    'invoice', jsonb_build_object(
      'invoice_number', null,
      'invoice_date', null,
      'invoice_currency', 'KGS',
      'payable_source', 'zero'
    ),
    'totals', jsonb_build_object(
      'payable_amount', 0,
      'total_paid', 0,
      'outstanding_amount', 0,
      'payments_count', 0,
      'payment_status', 'К оплате',
      'last_paid_at', null
    ),
    'eligibility', jsonb_build_object(
      'approved', false,
      'sent_to_accountant', false,
      'payment_eligible', false,
      'failure_code', 'proposal_not_found'
    ),
    'allocation_summary', jsonb_build_object(
      'paid_known_sum', 0,
      'paid_unassigned', 0,
      'allocation_count', 0
    ),
    'items', '[]'::jsonb,
    'meta', jsonb_build_object(
      'source_kind', 'rpc:accountant_proposal_financial_state_v1',
      'backend_truth', true,
      'legacy_total_paid', 0,
      'legacy_payment_status', null
    )
  )
);
$$;

comment on function public.accountant_proposal_financial_state_v1(text) is
'Canonical accountant proposal financial read model. DB-owned source for payable, paid, outstanding and line allocations.';

grant execute on function public.accountant_proposal_financial_state_v1(text) to authenticated;

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
  p_expected_outstanding numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_before record;
  v_after record;
  v_after_state jsonb;
  v_payment_id integer;
  v_amount numeric := round(coalesce(p_amount, 0)::numeric, 2);
  v_allocations jsonb := coalesce(p_allocations, '[]'::jsonb);
  v_invoice_number text := nullif(trim(coalesce(p_invoice_number, '')), '');
  v_invoice_currency text := nullif(trim(coalesce(p_invoice_currency, '')), '');
  v_actor_id uuid := auth.uid();
  v_allocated_total numeric := 0;
  v_allocation_count integer := 0;
  v_items_count integer := 0;
  v_has_unknown_allocation boolean := false;
  v_has_excess_allocation boolean := false;
begin
  select *
  into v_proposal
  from public.proposals p
  where p.id::text = trim(coalesce(p_proposal_id, ''))
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', trim(coalesce(p_proposal_id, '')),
      'failure_code', 'proposal_not_found',
      'failure_message', 'Proposal not found.'
    );
  end if;

  select *
  into v_before
  from public.accountant_proposal_financial_totals_v1(v_proposal.id::text);

  if not coalesce(v_before.sent_to_accountant, false) then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code',
      case
        when coalesce(v_before.approved, false) then 'approval_revoked'
        else 'proposal_not_approved'
      end,
      'failure_message',
      case
        when coalesce(v_before.approved, false) then 'Proposal approval/accountant handoff was revoked.'
        else 'Proposal is not approved for payment.'
      end,
      'validation', jsonb_build_object(
        'approved', v_before.approved,
        'sent_to_accountant', v_before.sent_to_accountant,
        'payment_eligible', v_before.payment_eligible,
        'proposal_status', v_before.proposal_status
      ),
      'totals_before', jsonb_build_object(
        'payable_amount', v_before.payable_amount,
        'total_paid', v_before.total_paid,
        'outstanding_amount', v_before.outstanding_amount,
        'payment_status', v_before.payment_status
      )
    );
  end if;

  if not coalesce(v_before.approved, false) then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'proposal_not_approved',
      'failure_message', 'Proposal is not approved for payment.',
      'validation', jsonb_build_object(
        'approved', v_before.approved,
        'sent_to_accountant', v_before.sent_to_accountant,
        'payment_eligible', v_before.payment_eligible,
        'proposal_status', v_before.proposal_status
      ),
      'totals_before', jsonb_build_object(
        'payable_amount', v_before.payable_amount,
        'total_paid', v_before.total_paid,
        'outstanding_amount', v_before.outstanding_amount,
        'payment_status', v_before.payment_status
      )
    );
  end if;

  if v_amount <= 0 then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'invalid_amount',
      'failure_message', 'Payment amount must be greater than zero.'
    );
  end if;

  if p_expected_total_paid is not null
     and abs(round(coalesce(p_expected_total_paid, 0)::numeric, 2) - round(coalesce(v_before.total_paid, 0)::numeric, 2)) > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'stale_financial_state',
      'failure_message', 'Financial state changed before payment commit.',
      'totals_before', jsonb_build_object(
        'payable_amount', v_before.payable_amount,
        'total_paid', v_before.total_paid,
        'outstanding_amount', v_before.outstanding_amount,
        'payment_status', v_before.payment_status
      )
    );
  end if;

  if p_expected_outstanding is not null
     and abs(round(coalesce(p_expected_outstanding, 0)::numeric, 2) - round(coalesce(v_before.outstanding_amount, 0)::numeric, 2)) > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'stale_financial_state',
      'failure_message', 'Outstanding balance changed before payment commit.',
      'totals_before', jsonb_build_object(
        'payable_amount', v_before.payable_amount,
        'total_paid', v_before.total_paid,
        'outstanding_amount', v_before.outstanding_amount,
        'payment_status', v_before.payment_status
      )
    );
  end if;

  if v_amount - coalesce(v_before.outstanding_amount, 0)::numeric > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'amount_exceeds_outstanding',
      'failure_message', 'Requested amount exceeds outstanding balance.',
      'totals_before', jsonb_build_object(
        'payable_amount', v_before.payable_amount,
        'total_paid', v_before.total_paid,
        'outstanding_amount', v_before.outstanding_amount,
        'payment_status', v_before.payment_status
      )
    );
  end if;

  select count(*)::integer
  into v_items_count
  from public.proposal_items pi
  where pi.proposal_id::text = v_proposal.id::text;

  with grouped_allocations as (
    select
      (entry.value ->> 'proposal_item_id')::bigint as proposal_item_id,
      round(sum((entry.value ->> 'amount')::numeric), 2)::numeric as amount
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_allocations) = 'array' then v_allocations
        else '[]'::jsonb
      end
    ) as entry(value)
    where nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '') ~ '^[0-9]+$'
      and coalesce((entry.value ->> 'amount')::numeric, 0) > 0
    group by (entry.value ->> 'proposal_item_id')::bigint
  )
  select
    coalesce(sum(ga.amount), 0)::numeric,
    count(*)::integer
  into v_allocated_total, v_allocation_count
  from grouped_allocations ga;

  if v_allocation_count > 0 then
    with grouped_allocations as (
      select
        (entry.value ->> 'proposal_item_id')::bigint as proposal_item_id,
        round(sum((entry.value ->> 'amount')::numeric), 2)::numeric as amount
      from jsonb_array_elements(
        case
          when jsonb_typeof(v_allocations) = 'array' then v_allocations
          else '[]'::jsonb
        end
      ) as entry(value)
      where nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '') ~ '^[0-9]+$'
        and coalesce((entry.value ->> 'amount')::numeric, 0) > 0
      group by (entry.value ->> 'proposal_item_id')::bigint
    ),
    item_outstanding as (
      select
        pi.id as proposal_item_id,
        greatest(
          round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2)
          - least(
            round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2),
            round(
              coalesce(
                sum(
                  case
                    when pp.id is not null then ppa.amount
                    else 0
                  end
                ),
                0
              ),
              2
            )
          ),
          0
        )::numeric as outstanding
      from public.proposal_items pi
      left join public.proposal_payment_allocations ppa
        on ppa.proposal_item_id = pi.id
      left join public.proposal_payments pp
        on pp.id = ppa.payment_id
        and pp.proposal_id::text = v_proposal.id::text
      where pi.proposal_id::text = v_proposal.id::text
      group by pi.id, pi.qty, pi.price
    )
    select
      exists(
        select 1
        from grouped_allocations ga
        left join item_outstanding io
          on io.proposal_item_id = ga.proposal_item_id
        where io.proposal_item_id is null
      ),
      exists(
        select 1
        from grouped_allocations ga
        join item_outstanding io
          on io.proposal_item_id = ga.proposal_item_id
        where ga.amount - io.outstanding > 0.01
      )
    into v_has_unknown_allocation, v_has_excess_allocation;

    if abs(v_allocated_total - v_amount) > 0.01 then
      return jsonb_build_object(
        'ok', false,
        'operation', 'accounting_pay_invoice_v1',
        'proposal_id', v_proposal.id::text,
        'failure_code', 'invalid_amount',
        'failure_message', 'Allocation total must equal requested payment amount.',
        'allocation_summary', jsonb_build_object(
          'allocation_count', v_allocation_count,
          'allocated_amount', v_allocated_total,
          'requested_amount', v_amount
        )
      );
    end if;

    if v_has_unknown_allocation then
      return jsonb_build_object(
        'ok', false,
        'operation', 'accounting_pay_invoice_v1',
        'proposal_id', v_proposal.id::text,
        'failure_code', 'stale_financial_state',
        'failure_message', 'Allocation references a missing or foreign proposal item.'
      );
    end if;

    if v_has_excess_allocation then
      return jsonb_build_object(
        'ok', false,
        'operation', 'accounting_pay_invoice_v1',
        'proposal_id', v_proposal.id::text,
        'failure_code', 'amount_exceeds_outstanding',
        'failure_message', 'Allocation exceeds current outstanding item balance.'
      );
    end if;
  elsif v_items_count > 0 and abs(v_amount - coalesce(v_before.outstanding_amount, 0)::numeric) > 0.01 then
    return jsonb_build_object(
      'ok', false,
      'operation', 'accounting_pay_invoice_v1',
      'proposal_id', v_proposal.id::text,
      'failure_code', 'stale_financial_state',
      'failure_message', 'Missing allocations for partial payment amount.'
    );
  end if;

  update public.proposals p
  set
    invoice_number = case
      when nullif(trim(coalesce(p.invoice_number, '')), '') is null and v_invoice_number is not null
        then v_invoice_number
      else p.invoice_number
    end,
    invoice_date = case
      when p.invoice_date is null and p_invoice_date is not null
        then p_invoice_date
      else p.invoice_date
    end,
    invoice_currency = case
      when nullif(trim(coalesce(p.invoice_currency, '')), '') is null
        then coalesce(v_invoice_currency, nullif(trim(coalesce(v_before.invoice_currency, '')), ''), 'KGS')
      else p.invoice_currency
    end,
    invoice_amount = case
      when p.invoice_amount is null and p_invoice_amount is not null
        then round(p_invoice_amount, 2)
      else p.invoice_amount
    end
  where p.id = v_proposal.id;

  insert into public.proposal_payments (
    proposal_id,
    amount,
    accountant_fio,
    purpose,
    method,
    note,
    currency,
    created_by
  )
  values (
    v_proposal.id,
    v_amount,
    nullif(trim(coalesce(p_accountant_fio, '')), ''),
    nullif(trim(coalesce(p_purpose, '')), ''),
    nullif(trim(coalesce(p_method, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    coalesce(v_invoice_currency, nullif(trim(coalesce(v_before.invoice_currency, '')), ''), 'KGS'),
    v_actor_id
  )
  returning id into v_payment_id;

  if v_items_count > 0 then
    if v_allocation_count > 0 then
      insert into public.proposal_payment_allocations (
        payment_id,
        proposal_item_id,
        amount
      )
      with grouped_allocations as (
        select
          (entry.value ->> 'proposal_item_id')::bigint as proposal_item_id,
          round(sum((entry.value ->> 'amount')::numeric), 2)::numeric as amount
        from jsonb_array_elements(
          case
            when jsonb_typeof(v_allocations) = 'array' then v_allocations
            else '[]'::jsonb
          end
        ) as entry(value)
        where nullif(trim(coalesce(entry.value ->> 'proposal_item_id', '')), '') ~ '^[0-9]+$'
          and coalesce((entry.value ->> 'amount')::numeric, 0) > 0
        group by (entry.value ->> 'proposal_item_id')::bigint
      )
      select
        v_payment_id,
        ga.proposal_item_id,
        ga.amount
      from grouped_allocations ga;
    else
      insert into public.proposal_payment_allocations (
        payment_id,
        proposal_item_id,
        amount
      )
      with item_outstanding as (
        select
          pi.id as proposal_item_id,
          greatest(
            round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2)
            - least(
              round(coalesce(pi.qty, 0)::numeric * coalesce(pi.price, 0)::numeric, 2),
              round(
                coalesce(
                  sum(
                    case
                      when pp.id is not null then ppa.amount
                      else 0
                    end
                  ),
                  0
                ),
                2
              )
            ),
            0
          )::numeric as outstanding
        from public.proposal_items pi
        left join public.proposal_payment_allocations ppa
          on ppa.proposal_item_id = pi.id
        left join public.proposal_payments pp
          on pp.id = ppa.payment_id
          and pp.proposal_id::text = v_proposal.id::text
        where pi.proposal_id::text = v_proposal.id::text
        group by pi.id, pi.qty, pi.price
      )
      select
        v_payment_id,
        io.proposal_item_id,
        io.outstanding
      from item_outstanding io
      where io.outstanding > 0.01;
    end if;
  end if;

  select *
  into v_after
  from public.accountant_proposal_financial_totals_v1(v_proposal.id::text);

  update public.proposals p
  set
    total_paid = v_after.total_paid,
    payment_status = v_after.payment_status
  where p.id = v_proposal.id;

  select public.accountant_proposal_financial_state_v1(v_proposal.id::text)
  into v_after_state;

  return jsonb_build_object(
    'ok', true,
    'operation', 'accounting_pay_invoice_v1',
    'proposal_id', v_proposal.id::text,
    'payment_id', v_payment_id,
    'allocation_summary', jsonb_build_object(
      'allocation_count', coalesce(v_allocation_count, 0),
      'allocated_amount',
      case
        when v_allocation_count > 0 then v_allocated_total
        else v_amount
      end,
      'requested_amount', v_amount
    ),
    'validation', jsonb_build_object(
      'approved', v_before.approved,
      'sent_to_accountant', v_before.sent_to_accountant,
      'payment_eligible', v_before.payment_eligible,
      'proposal_status', v_before.proposal_status
    ),
    'totals_before', jsonb_build_object(
      'payable_amount', v_before.payable_amount,
      'total_paid', v_before.total_paid,
      'outstanding_amount', v_before.outstanding_amount,
      'payment_status', v_before.payment_status
    ),
    'totals_after', jsonb_build_object(
      'payable_amount', v_after.payable_amount,
      'total_paid', v_after.total_paid,
      'outstanding_amount', v_after.outstanding_amount,
      'payment_status', v_after.payment_status
    ),
    'server_truth', v_after_state
  );
end;
$$;

comment on function public.accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric) is
'Atomic server-owned accountant payment mutation. Validates approval/payment eligibility, locks proposal state, writes payment/allocation(s), updates legacy mirrors and returns canonical DB truth.';

grant execute on function public.accounting_pay_invoice_v1(text, numeric, text, text, text, text, jsonb, text, date, numeric, text, numeric, numeric) to authenticated;

with recalculated as (
  select
    p.id,
    ft.total_paid,
    ft.payment_status
  from public.proposals p
  cross join lateral public.accountant_proposal_financial_totals_v1(p.id::text) ft
  where p.sent_to_accountant_at is not null
     or exists (
       select 1
       from public.proposal_payments pp
       where pp.proposal_id::text = p.id::text
     )
)
update public.proposals p
set
  total_paid = r.total_paid,
  payment_status = r.payment_status
from recalculated r
where p.id = r.id
  and (
    coalesce(p.total_paid, -1) is distinct from coalesce(r.total_paid, -1)
    or coalesce(p.payment_status, '') is distinct from coalesce(r.payment_status, '')
  );

commit;
