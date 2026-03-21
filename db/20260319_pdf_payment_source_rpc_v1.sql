begin;

create or replace function public.pdf_payment_source_v1(
  p_payment_id bigint
)
returns jsonb
language sql
stable
set search_path = public
as $$
with legacy_payload as (
  select public.get_payment_order_data(p_payment_id::integer)::jsonb as payload
),
header_data as (
  select jsonb_build_object(
    'company', coalesce(lp.payload -> 'company', '{}'::jsonb),
    'payment', coalesce(lp.payload -> 'payment', '{}'::jsonb),
    'proposal', coalesce(lp.payload -> 'proposal', '{}'::jsonb),
    'supplier', lp.payload -> 'supplier'
  ) as value
  from legacy_payload lp
),
rows_data as (
  select
    case
      when jsonb_typeof(lp.payload -> 'items') = 'array' then lp.payload -> 'items'
      else '[]'::jsonb
    end as value
  from legacy_payload lp
),
attachments_data as (
  select
    case
      when jsonb_typeof(lp.payload -> 'attachments') = 'array' then lp.payload -> 'attachments'
      when jsonb_typeof(lp.payload -> 'payment_files') = 'array' then lp.payload -> 'payment_files'
      when jsonb_typeof(lp.payload -> 'files') = 'array' then lp.payload -> 'files'
      else '[]'::jsonb
    end as value
  from legacy_payload lp
),
allocations_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'proposal_item_id', ppa.proposal_item_id,
        'amount', ppa.amount
      )
      order by ppa.proposal_item_id asc, ppa.id asc
    ),
    '[]'::jsonb
  ) as value
  from public.proposal_payment_allocations ppa
  where ppa.payment_id = p_payment_id::integer
)
select
  case
    when lp.payload is null then null
    else jsonb_build_object(
      'document_type', 'payment_order',
      'version', 'v1',
      'generated_at', timezone('utc', now()),
      'document_id', coalesce(
        nullif(btrim(coalesce(lp.payload #>> '{payment,payment_id}', '')), ''),
        p_payment_id::text
      ),
      'source_branch', 'canonical',
      'header', hd.value,
      'rows', rd.value,
      'allocations', ad.value,
      'attachments_meta', atd.value,
      'totals', jsonb_build_object(
        'amount', coalesce(lp.payload #> '{payment,amount}', '0'::jsonb),
        'total_paid', coalesce(lp.payload #> '{payment,total_paid}', '0'::jsonb),
        'proposal_items_total', coalesce(lp.payload #> '{proposal,items_total}', '0'::jsonb)
      ),
      'meta', jsonb_build_object(
        'payment_id', p_payment_id,
        'legacy_function', 'get_payment_order_data',
        'payload_shape_version', 'v1'
      )
    )
  end
from legacy_payload lp
cross join header_data hd
cross join rows_data rd
cross join attachments_data atd
cross join allocations_data ad;
$$;

comment on function public.pdf_payment_source_v1(bigint) is
'Payment PDF canonical source envelope v1. Wraps get_payment_order_data plus manual allocations into one read-only RPC, leaving contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_payment_source_v1(bigint) to authenticated;

commit;
