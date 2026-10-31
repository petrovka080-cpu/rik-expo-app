-- Exact existing Office RPC contracts from reviewed staging metadata.
-- Keep signatures, financial arithmetic and existing workflow bodies.
-- Revoke explicit anon grants as well as PUBLIC defaults; authorize every
-- callable legacy overload before mutation, including the underlying entries.

-- Reviewed preimage SHA256 cc52c9ec68dd102bc4f149402e373f4de66ae99d055a0b5810f45cab44d8c446
CREATE OR REPLACE FUNCTION public._proposal_total_paid(p_id text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_id::text,array['director','accountant','buyer']::text[]);
  return (select coalesce(sum(amount), 0)::numeric
  from public.proposal_payments
  where proposal_id::text = p_id);
end;
$function$;
revoke all on function public._proposal_total_paid(text) from public,anon;
grant execute on function public._proposal_total_paid(text) to authenticated,service_role;

-- Reviewed preimage SHA256 b2e33984a298394b32a689aa281509e5ea3745ffb45d2f5db1eb9c46edcac3f6
CREATE OR REPLACE FUNCTION public._proposal_total_paid_uuid(p_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_id::text,array['director','accountant','buyer']::text[]);
  return (select coalesce(sum(amount), 0)::numeric
  from public.proposal_payments
  where proposal_id = p_id);
end;
$function$;
revoke all on function public._proposal_total_paid_uuid(uuid) from public,anon;
grant execute on function public._proposal_total_paid_uuid(uuid) to authenticated,service_role;

-- Reviewed preimage SHA256 eb9dfc98078ddb5b287adda327c836297ac2dbda3369da0df868be1866f6b12f
CREATE OR REPLACE FUNCTION public.acc_add_payment_min(p_proposal_id uuid, p_amount numeric, p_method text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  insert into public.proposal_payments (
    proposal_id,
    paid_at,
    amount,
    currency,
    method,
    note
  )
  values (
    p_proposal_id,
    now(),
    p_amount,
    'KGS',       -- 👈 ВСЕГДА ставим валюту
    p_method,
    p_note
  );
end;
$function$;
revoke all on function public.acc_add_payment_min(uuid,numeric,text,text) from public,anon;
grant execute on function public.acc_add_payment_min(uuid,numeric,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 9c6b676999ae883b29f35bd10f5c139b4a5df719dbf94a76db3fbe33cef165bd
CREATE OR REPLACE FUNCTION public.acc_add_payment_min_compat(proposal_id uuid, amount numeric, method text DEFAULT NULL::text, note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',proposal_id::text,array['accountant']::text[]);
  perform public.acc_add_payment_min(
    proposal_id,
    amount,
    method,
    note
  );
end;
$function$;
revoke all on function public.acc_add_payment_min_compat(uuid,numeric,text,text) from public,anon;
grant execute on function public.acc_add_payment_min_compat(uuid,numeric,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 993c432ddabc1893b8eb95b5b090e2ec6c6bb571ced57e799f756a8b4658fee5
CREATE OR REPLACE FUNCTION public.acc_add_payment_min_uuid(p_proposal_id uuid, p_amount numeric, p_method text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_total numeric; v_due numeric; v_new numeric;
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  if coalesce(p_amount,0) <= 0 then
    raise exception 'amount must be > 0';
  end if;

  -- ВСТАВЛЯЕМ КАК UUID (без ::text)
  insert into public.proposal_payments (proposal_id, amount, method, note)
  values (p_proposal_id, round(p_amount::numeric,2), nullif(p_method,''), nullif(p_note,''));

  -- считаем total по UUID
  select public._proposal_total_paid_uuid(p_proposal_id) into v_total;

  -- invoice_amount берём из proposals (uuid = uuid)
  select coalesce(invoice_amount,0)::numeric into v_due
  from public.proposals
  where id = p_proposal_id;

  v_new := coalesce(v_total,0);

  update public.proposals
  set status = case
                 when v_due > 0 and v_new >= v_due then 'Оплачено'
                 when v_new > 0 then 'Частично оплачено'
                 else status
               end
  where id = p_proposal_id;
end
$function$;
revoke all on function public.acc_add_payment_min_uuid(uuid,numeric,text,text) from public,anon;
grant execute on function public.acc_add_payment_min_uuid(uuid,numeric,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 eeb90a3d99b761f34b161d9c99da3f1b7e26715522057436fa35b1a684d4eda2
CREATE OR REPLACE FUNCTION public.acc_add_payment_v2_uuid(p_proposal_id uuid, p_amount numeric, p_accountant_fio text, p_purpose text, p_method text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  if coalesce(trim(p_accountant_fio), '') = '' then
    raise exception 'ФИО бухгалтера обязательно';
  end if;

  if coalesce(trim(p_purpose), '') = '' then
    raise exception 'Назначение платежа обязательно';
  end if;

  insert into public.proposal_payments (
    proposal_id,
    paid_at,
    amount,
    currency,
    method,
    note,
    accountant_fio,
    purpose
  )
  values (
    p_proposal_id,
    now(),
    p_amount,
    'KGS',
    p_method,
    p_note,
    trim(p_accountant_fio),
    trim(p_purpose)
  );
end;
$function$;
revoke all on function public.acc_add_payment_v2_uuid(uuid,numeric,text,text,text,text) from public,anon;
grant execute on function public.acc_add_payment_v2_uuid(uuid,numeric,text,text,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 a588c51dff0ffab8155e40d982d60759bd79bf08ca6c2066a750e59b1044a5b7
CREATE OR REPLACE FUNCTION public.acc_add_payment_v3_uuid(p_proposal_id uuid, p_amount numeric, p_accountant_fio text, p_purpose text, p_method text, p_note text DEFAULT NULL::text, p_allocations jsonb DEFAULT '[]'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_payment_id bigint;
  v_alloc_sum numeric := 0;
  v_bad_count int := 0;
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  -- базовая защита
  if p_proposal_id is null then
    raise exception 'p_proposal_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;

  -- если allocations переданы и это массив
  if p_allocations is not null and jsonb_typeof(p_allocations) = 'array' then

    -- считаем сумму только по amount > 0
    select coalesce(sum(t.amount), 0)
      into v_alloc_sum
    from jsonb_to_recordset(p_allocations) as t(proposal_item_id bigint, amount numeric)
    where coalesce(t.amount, 0) > 0;

    -- если массив НЕ пустой (есть >0), то сумма allocations обязана совпасть с суммой платежа
    if v_alloc_sum > 0 then
      if abs(v_alloc_sum - p_amount) > 0.01 then
        raise exception 'allocations sum (%) must equal payment amount (%)', v_alloc_sum, p_amount;
      end if;

      -- проверка: все proposal_item_id принадлежат этому proposal_id
      select count(*) into v_bad_count
      from jsonb_to_recordset(p_allocations) as t(proposal_item_id bigint, amount numeric)
      left join public.proposal_items pi
        on pi.id = t.proposal_item_id
       and pi.proposal_id = p_proposal_id
      where coalesce(t.amount, 0) > 0
        and (pi.id is null);

      if v_bad_count > 0 then
        raise exception 'allocations contain items not belonging to proposal_id (%)', p_proposal_id;
      end if;
    end if;
  end if;

  -- создаём платеж
  insert into public.proposal_payments (
    proposal_id, amount, accountant_fio, purpose, method, note, paid_at
  )
  values (
    p_proposal_id, p_amount, p_accountant_fio, p_purpose, p_method, p_note, now()
  )
  returning id into v_payment_id;

  -- пишем allocations
  if p_allocations is not null and jsonb_typeof(p_allocations) = 'array' then
    insert into public.proposal_payment_allocations (payment_id, proposal_item_id, amount)
    select
      v_payment_id,
      t.proposal_item_id,
      coalesce(t.amount, 0)
    from jsonb_to_recordset(p_allocations) as t(proposal_item_id bigint, amount numeric)
    where coalesce(t.amount, 0) > 0;
  end if;

  return v_payment_id;
end;
$function$;
revoke all on function public.acc_add_payment_v3_uuid(uuid,numeric,text,text,text,text,jsonb) from public,anon;
grant execute on function public.acc_add_payment_v3_uuid(uuid,numeric,text,text,text,text,jsonb) to authenticated,service_role;

-- Reviewed preimage SHA256 d411e581c0e07f7ddbf96ef5d948febd6507c82314dcaa424b970bf80f7e41f5
CREATE OR REPLACE FUNCTION public.acc_return(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);
  perform public.acc_return_min_auto(p_proposal_id, p_comment);
end;
$function$;
revoke all on function public.acc_return(uuid,text) from public,anon;
grant execute on function public.acc_return(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 bcb0bdf206d7af17f73b0f6e0c0a277097b7a01978931ee23da9dbff5f813fd2
CREATE OR REPLACE FUNCTION public.acc_return_min(p_proposal_id text, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  begin
    update public.proposals
       set payment_status = 'На доработке'
     where id::text = p_proposal_id;
  exception when undefined_column then
    return; -- если колонки нет — молча выходим, не ломаем старую модель
  end;
end;
$function$;
revoke all on function public.acc_return_min(text,text) from public,anon;
grant execute on function public.acc_return_min(text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 5cf8c7dc877c22e06fdea2fb48bc377217229f65430aa2c10304c2bca80ffaa5
CREATE OR REPLACE FUNCTION public.acc_return_min(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);
  perform public.acc_return_min_auto(p_proposal_id, p_comment);
end;
$function$;
revoke all on function public.acc_return_min(uuid,text) from public,anon;
grant execute on function public.acc_return_min(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 f2601be9ad8645db5fa421661c2b8e31a920f1fadea821864f8d0f8f616c2cf8
CREATE OR REPLACE FUNCTION public.acc_return_min_auto(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  update public.proposals
  set
    status         = 'На доработке',
    payment_status = 'На доработке'
  where id = p_proposal_id;

  if not found then
    raise exception 'proposal % not found', p_proposal_id;
  end if;
end;
$function$;
revoke all on function public.acc_return_min_auto(uuid,text) from public,anon;
grant execute on function public.acc_return_min_auto(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 bb7be33840d4291db468e304348379eecc67626be088bf96a61ac25694c9ff9f
CREATE OR REPLACE FUNCTION public.acc_return_min_by_text(p_proposal_id text, p_comment text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  perform public.acc_return_min(p_proposal_id, p_comment); -- выберется (text,text)
end;
$function$;
revoke all on function public.acc_return_min_by_text(text,text) from public,anon;
grant execute on function public.acc_return_min_by_text(text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 27459f4263c9d77c39b1c3a026f47f0ad1631bfa28bf43e07775cf35232a364e
CREATE OR REPLACE FUNCTION public.acc_return_min_by_uuid(p_proposal_id uuid, p_comment text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  perform public.acc_return_min(p_proposal_id, p_comment); -- выберется (uuid,text)
end;
$function$;
revoke all on function public.acc_return_min_by_uuid(uuid,text) from public,anon;
grant execute on function public.acc_return_min_by_uuid(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 ffa1a5df9c660200a5ceb51b930b20658ac77850f4ec9cc274aa65609e5481ec
CREATE OR REPLACE FUNCTION public.acc_return_min_compat(p_proposal_id text, p_comment text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cnt int := 0;
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  update public.proposals
     set payment_status = 'На доработке',
         status = status,              -- закупочный оставляем как есть (или тоже меняй, если принял Вариант B)
         sent_to_accountant_at = null
   where id::text = p_proposal_id
     and coalesce(payment_status, 'К оплате') in ('К оплате','Частично оплачено');

  get diagnostics v_cnt = row_count;
  return v_cnt > 0;
end;
$function$;
revoke all on function public.acc_return_min_compat(text,text) from public,anon;
grant execute on function public.acc_return_min_compat(text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 d8e8cd4a7a0c5b7622770325192a2d3aade1e3df5bcfba8fbb255e9a47d5af80
CREATE OR REPLACE FUNCTION public.acc_return_min_uuid(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  update public.proposals
  set status       = 'На доработке (снабженец)',
      redo_source  = 'accountant',
      redo_comment = nullif(p_comment,'')
  where id = p_proposal_id;
end;
$function$;
revoke all on function public.acc_return_min_uuid(uuid,text) from public,anon;
grant execute on function public.acc_return_min_uuid(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 acb3741ffe91f70b19500c46a47abae6c9811e4a93856a3ccfdee669faa9c753
CREATE OR REPLACE FUNCTION public.accountant_add_payment(p_proposal_id uuid, p_amount numeric, p_currency text DEFAULT 'KGS'::text, p_paid_at date DEFAULT now(), p_method text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  insert into public.proposal_payments(proposal_id, amount, currency, paid_at, method, note)
  values (p_proposal_id, p_amount, p_currency, p_paid_at, p_method, p_note);

  -- обновим сумму оплаченного
  update public.proposals p
  set total_paid = coalesce(total_paid,0) + p_amount,
      status = case
                 when coalesce(total_paid,0) + p_amount >= coalesce(invoice_amount,0)
                 then 'Оплачено'
                 else status
               end
  where p.id = p_proposal_id;
end;
$function$;
revoke all on function public.accountant_add_payment(uuid,numeric,text,date,text,text) from public,anon;
grant execute on function public.accountant_add_payment(uuid,numeric,text,date,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 ba4492680471379f4d9887f6ca91cb1db6e1b91a857d91cc0015f856703db125
CREATE OR REPLACE FUNCTION public.accountant_history_scope_v1(p_date_from text DEFAULT NULL::text, p_date_to text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with scope_input as (
  select
    nullif(trim(coalesce(p_date_from, '')), '')::date as date_from,
    nullif(trim(coalesce(p_date_to, '')), '')::date as date_to,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text,
    greatest(0, coalesce(p_offset, 0))::integer as offset_rows,
    least(300, greatest(1, coalesce(p_limit, 50)))::integer as limit_rows
),
invoice_flags as (
  select
    pa.proposal_id::text as proposal_id,
    true as has_invoice
  from public.proposal_attachments pa
  where pa.group_key = 'invoice'
  group by pa.proposal_id::text
),
base_rows as (
  select
    pp.id::bigint as payment_id,
    pp.paid_at,
    pp.proposal_id::text as proposal_id,
    nullif(trim(coalesce(p.supplier, '')), '') as supplier,
    nullif(trim(coalesce(p.invoice_number, '')), '') as invoice_number,
    p.invoice_date,
    p.invoice_amount,
    coalesce(nullif(trim(coalesce(p.invoice_currency, '')), ''), 'KGS') as invoice_currency,
    coalesce(pp.amount, 0)::numeric as amount,
    nullif(trim(coalesce(pp.method, '')), '') as method,
    nullif(trim(coalesce(pp.note, '')), '') as note,
    coalesce(ifg.has_invoice, false) as has_invoice,
    nullif(trim(coalesce(pp.accountant_fio, '')), '') as accountant_fio,
    nullif(trim(coalesce(pp.purpose, '')), '') as purpose
  from public.proposal_payments pp
  join public.proposals p
    on p.id = pp.proposal_id
  left join invoice_flags ifg
    on ifg.proposal_id = pp.proposal_id::text
  cross join scope_input si
  where public.office_proposal_role_allowed_v1(p.id,array['director','accountant']::text[])
    and (si.date_from is null or pp.paid_at::date >= si.date_from)
    and (si.date_to is null or pp.paid_at::date <= si.date_to)
    and (
      si.search_text is null
      or lower(coalesce(p.supplier, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(p.invoice_number, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(pp.purpose, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(pp.note, '')) like ('%' || si.search_text || '%')
    )
),
ordered_rows as (
  select
    br.*,
    row_number() over (
      order by br.paid_at desc nulls last, br.payment_id desc
    ) - 1 as row_index
  from base_rows br
),
page_rows as (
  select
    orw.*
  from ordered_rows orw
  cross join scope_input si
  where orw.row_index >= si.offset_rows
    and orw.row_index < (si.offset_rows + si.limit_rows)
),
meta_counts as (
  select
    coalesce((select count(*)::integer from ordered_rows), 0) as total_row_count,
    coalesce((select count(*)::integer from page_rows), 0) as returned_row_count,
    coalesce((select sum(br.amount) from base_rows br), 0)::numeric as total_amount
)
select jsonb_build_object(
  'document_type', 'accountant_history_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'payment_id', pr.payment_id,
          'paid_at', pr.paid_at,
          'proposal_id', pr.proposal_id,
          'supplier', pr.supplier,
          'invoice_number', pr.invoice_number,
          'invoice_date', pr.invoice_date,
          'invoice_amount', pr.invoice_amount,
          'invoice_currency', pr.invoice_currency,
          'amount', pr.amount,
          'method', pr.method,
          'note', pr.note,
          'has_invoice', pr.has_invoice,
          'accountant_fio', pr.accountant_fio,
          'purpose', pr.purpose
        )
        order by pr.row_index asc
      )
      from page_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'accountant_history_scope_v1',
    'legacy_rows_source', 'proposal_payments+proposals+proposal_attachments',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_rows', (select offset_rows from scope_input),
    'limit_rows', (select limit_rows from scope_input),
    'returned_row_count', (select returned_row_count from meta_counts),
    'total_row_count', (select total_row_count from meta_counts),
    'total_amount', (select total_amount from meta_counts),
    'has_more', (
      (select offset_rows from scope_input) + (select returned_row_count from meta_counts)
    ) < (select total_row_count from meta_counts),
    'date_from', (select date_from from scope_input),
    'date_to', (select date_to from scope_input),
    'search', (select search_text from scope_input)
  )
);
$function$;
revoke all on function public.accountant_history_scope_v1(text,text,text,integer,integer) from public,anon;
grant execute on function public.accountant_history_scope_v1(text,text,text,integer,integer) to authenticated,service_role;

-- Reviewed preimage SHA256 7514a547415d392f415fbbf64eea55da44e9b9e1f30754ddf4e0362c77627fa1
CREATE OR REPLACE FUNCTION public.accountant_inbox_scope_v1(p_tab text DEFAULT NULL::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 40)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with scope_input as (
  select
    nullif(trim(coalesce(p_tab, '')), '') as tab_name,
    greatest(0, coalesce(p_offset, 0))::integer as offset_rows,
    least(200, greatest(1, coalesce(p_limit, 40)))::integer as limit_rows
),
base_rows as (
  select
    trim(coalesce(src.row_json ->> 'proposal_id', '')) as proposal_id,
    nullif(trim(coalesce(src.row_json ->> 'supplier', '')), '') as supplier,
    nullif(trim(coalesce(src.row_json ->> 'invoice_number', '')), '') as invoice_number,
    nullif(trim(coalesce(src.row_json ->> 'invoice_date', '')), '') as invoice_date,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'invoice_currency', '')), ''),
      'KGS'
    ) as invoice_currency,
    nullif(trim(coalesce(src.row_json ->> 'payment_status', '')), '') as payment_status,
    case
      when nullif(trim(coalesce(src.row_json ->> 'invoice_amount', '')), '') is null then null
      else (src.row_json ->> 'invoice_amount')::numeric
    end as invoice_amount,
    case
      when nullif(trim(coalesce(src.row_json ->> 'total_paid', '')), '') is null then 0::numeric
      else (src.row_json ->> 'total_paid')::numeric
    end as total_paid,
    case
      when nullif(trim(coalesce(src.row_json ->> 'payments_count', '')), '') is null then 0::integer
      else (src.row_json ->> 'payments_count')::integer
    end as payments_count,
    case
      when nullif(trim(coalesce(src.row_json ->> 'has_invoice', '')), '') is null then false
      else (src.row_json ->> 'has_invoice')::boolean
    end as has_invoice,
    nullif(trim(coalesce(src.row_json ->> 'sent_to_accountant_at', '')), '')::timestamptz as sent_to_accountant_at
  from public.list_accountant_inbox_fact((select tab_name from scope_input)) as src(row_json)
  where nullif(trim(coalesce(src.row_json ->> 'proposal_id', '')), '') is not null
    and public.office_proposal_role_allowed_v1((src.row_json ->> 'proposal_id')::uuid,array['director','accountant']::text[])
),
canonical_rows as (
  select
    br.proposal_id,
    nullif(trim(coalesce(p.proposal_no::text, p.display_no::text, '')), '') as proposal_no,
    nullif(trim(coalesce(p.id_short::text, '')), '') as id_short,
    coalesce(ft.supplier, br.supplier) as supplier,
    coalesce(ft.invoice_number, br.invoice_number) as invoice_number,
    coalesce(ft.invoice_date::text, br.invoice_date) as invoice_date,
    coalesce(ft.payable_amount, br.invoice_amount, 0)::numeric as invoice_amount,
    coalesce(
      ft.outstanding_amount,
      greatest(coalesce(br.invoice_amount, 0) - coalesce(br.total_paid, 0), 0),
      0
    )::numeric as outstanding_amount,
    coalesce(ft.invoice_currency, br.invoice_currency, 'KGS') as invoice_currency,
    coalesce(ft.payment_status, br.payment_status) as payment_status,
    coalesce(ft.total_paid, br.total_paid, 0)::numeric as total_paid,
    coalesce(ft.payments_count, br.payments_count, 0)::integer as payments_count,
    coalesce(
      br.has_invoice,
      ft.invoice_number is not null
    ) as has_invoice,
    coalesce(ft.sent_to_accountant_at, br.sent_to_accountant_at) as sent_to_accountant_at,
    coalesce(ft.payment_eligible, false) as payment_eligible,
    ft.failure_code,
    coalesce(ft.last_paid_at, null)::timestamptz as last_paid_at,
    (extract(epoch from ft.last_paid_at) * 1000)::bigint as last_paid_at_ms
  from base_rows br
  left join public.proposals p
    on p.id::text = br.proposal_id
  left join lateral public.accountant_proposal_financial_totals_v1(br.proposal_id) ft
    on true
),
ordered_rows as (
  select
    cr.*,
    row_number() over (
      order by
        case
          when (select tab_name from scope_input) in ('Р§Р°СЃС‚РёС‡РЅРѕ', 'Р§Р°СЃС‚РёС‡РЅРѕ РѕРїР»Р°С‡РµРЅРѕ', 'РћРїР»Р°С‡РµРЅРѕ')
            then cr.last_paid_at
          else null
        end desc nulls last,
        cr.sent_to_accountant_at desc nulls last,
        cr.proposal_id asc
    ) - 1 as row_index
  from canonical_rows cr
),
page_rows as (
  select
    orw.*
  from ordered_rows orw
  cross join scope_input si
  where orw.row_index >= si.offset_rows
    and orw.row_index < (si.offset_rows + si.limit_rows)
),
meta_counts as (
  select
    coalesce((select count(*)::integer from ordered_rows), 0) as total_row_count,
    coalesce((select count(*)::integer from page_rows), 0) as returned_row_count
)
select jsonb_build_object(
  'document_type', 'accountant_inbox_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'proposal_id', pr.proposal_id,
          'proposal_no', pr.proposal_no,
          'id_short', pr.id_short,
          'supplier', pr.supplier,
          'invoice_number', pr.invoice_number,
          'invoice_date', pr.invoice_date,
          'invoice_amount', pr.invoice_amount,
          'outstanding_amount', pr.outstanding_amount,
          'invoice_currency', pr.invoice_currency,
          'payment_status', pr.payment_status,
          'total_paid', pr.total_paid,
          'payments_count', pr.payments_count,
          'has_invoice', pr.has_invoice,
          'sent_to_accountant_at', pr.sent_to_accountant_at,
          'payment_eligible', pr.payment_eligible,
          'failure_code', pr.failure_code,
          'last_paid_at', pr.last_paid_at_ms
        )
        order by pr.row_index asc
      )
      from page_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'accountant_inbox_scope_v1',
    'legacy_rows_source', 'list_accountant_inbox_fact',
    'canonical_finance_source', 'accountant_proposal_financial_totals_v1',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_rows', (select offset_rows from scope_input),
    'limit_rows', (select limit_rows from scope_input),
    'returned_row_count', (select returned_row_count from meta_counts),
    'total_row_count', (select total_row_count from meta_counts),
    'has_more', (
      (select offset_rows from scope_input) + (select returned_row_count from meta_counts)
    ) < (select total_row_count from meta_counts),
    'tab', (select tab_name from scope_input)
  )
);
$function$;
revoke all on function public.accountant_inbox_scope_v1(text,integer,integer) from public,anon;
grant execute on function public.accountant_inbox_scope_v1(text,integer,integer) to authenticated,service_role;

-- Reviewed preimage SHA256 29e5ba3d403b9611fea5df3699a26c7e1c5c6ab9fdb71cd70f30b148b46bda6b
CREATE OR REPLACE FUNCTION public.accountant_mass_add_payment(p_ids uuid[], p_sum numeric, p_mtd text DEFAULT 'банк'::text, p_note text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_done int := 0;
begin
  perform public.office_require_document_role_v1('proposal',checked_id::text,array['accountant']::text[]) from unnest(p_ids) as ids(checked_id);

  if p_ids is null or array_length(p_ids,1) is null then return 0; end if;
  if coalesce(p_sum,0) <= 0 then raise exception 'amount must be > 0'; end if;

  foreach v_id in array p_ids loop
    perform public.acc_add_payment_min_uuid(v_id, p_sum, p_mtd, p_note);
    v_done := v_done + 1;
  end loop;

  return v_done;
end;
$function$;
revoke all on function public.accountant_mass_add_payment(uuid[],numeric,text,text) from public,anon;
grant execute on function public.accountant_mass_add_payment(uuid[],numeric,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 d9a271103bcc5a6e317e4c7e4660e6980d570d81bbe8026249d9a74311c6c802
CREATE OR REPLACE FUNCTION public.accountant_mass_return(p_ids uuid[], p_comment text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_done int := 0;
begin
  perform public.office_require_document_role_v1('proposal',checked_id::text,array['accountant']::text[]) from unnest(p_ids) as ids(checked_id);

  if p_ids is null or array_length(p_ids,1) is null then return 0; end if;
  foreach v_id in array p_ids loop
    perform public.acc_return_min_uuid(v_id, p_comment);
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$function$;
revoke all on function public.accountant_mass_return(uuid[],text) from public,anon;
grant execute on function public.accountant_mass_return(uuid[],text) to authenticated,service_role;

-- Reviewed preimage SHA256 1c98dbd49a87b35d987f6b227f1f1e8d682b71cd9342ce3653f1ea1766d29c2f
CREATE OR REPLACE FUNCTION public.accountant_proposal_financial_state_v1(p_proposal_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['director','accountant','buyer']::text[]);
  return (with totals as (
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
));
end;
$function$;
revoke all on function public.accountant_proposal_financial_state_v1(text) from public,anon;
grant execute on function public.accountant_proposal_financial_state_v1(text) to authenticated,service_role;

-- Reviewed preimage SHA256 5a96d3021502da3d579b9bce0f2b41bd14d3b21ff54ab5219c38ed5d4acd1920
CREATE OR REPLACE FUNCTION public.accountant_proposal_financial_totals_v1(p_proposal_id text)
 RETURNS TABLE(proposal_id text, proposal_status text, sent_to_accountant_at timestamp with time zone, supplier text, invoice_number text, invoice_date date, invoice_currency text, payable_amount numeric, total_paid numeric, outstanding_amount numeric, payments_count integer, approved boolean, sent_to_accountant boolean, payment_eligible boolean, payment_status text, failure_code text, last_paid_at timestamp with time zone, legacy_total_paid numeric, legacy_payment_status text, payable_source text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with proposal_row as (
  select p.*
  from public.proposals p
  where p.id::text = trim(coalesce(p_proposal_id, ''))
    and public.office_proposal_role_allowed_v1(p.id,array['director','accountant','buyer']::text[])
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
$function$;
revoke all on function public.accountant_proposal_financial_totals_v1(text) from public,anon;
grant execute on function public.accountant_proposal_financial_totals_v1(text) to authenticated,service_role;

-- Reviewed preimage SHA256 ca939ce1cd5ed6ce50426cfe2d89d2894a7298d01c944e325fccaba9734aabe7
CREATE OR REPLACE FUNCTION public.accountant_return_to_buyer(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['accountant']::text[]);

  update public.proposals
     set status       = 'На доработке',
         redo_source  = 'accountant',
         redo_comment = nullif(btrim(p_comment), ''),
         updated_at   = now()
   where id = p_proposal_id;
end;
$function$;
revoke all on function public.accountant_return_to_buyer(uuid,text) from public,anon;
grant execute on function public.accountant_return_to_buyer(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 a228761c6fcd557fb690edc5af3de08c7979355e476beece9a9121870acaf9b8
CREATE OR REPLACE FUNCTION public.director_approve_min_auto(p_proposal_id uuid, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['director']::text[]);

  -- 1) шапка предложения
  update public.proposals
     set status = 'Утверждено',
         decided_at = now()
   where id = p_proposal_id;

  -- 2) строки предложения: всё, что не "На доработке" → "Утверждено"
  update public.proposal_items
     set status = 'Утверждено'
   where proposal_id = p_proposal_id
     and coalesce(status, '') <> 'На доработке';

  -- 3) связанные request_items для утверждённых строк → "Утверждено"
  update public.request_items ri
     set status = 'Утверждено'
    from public.proposal_items pi
   where pi.proposal_id = p_proposal_id
     and coalesce(pi.status, '') <> 'На доработке'
     and pi.request_item_id is not null
     and ri.id = pi.request_item_id;

  -- 4) связанные request_items для строк "На доработке" → "На доработке" (на всякий случай)
  update public.request_items ri
     set status = 'На доработке'
    from public.proposal_items pi
   where pi.proposal_id = p_proposal_id
     and coalesce(pi.status, '') = 'На доработке'
     and pi.request_item_id is not null
     and ri.id = pi.request_item_id;
end;
$function$;
revoke all on function public.director_approve_min_auto(uuid,text) from public,anon;
grant execute on function public.director_approve_min_auto(uuid,text) to authenticated,service_role;

-- Reviewed preimage SHA256 08e1b86a735fead2601c48568e6ef6da09482f912f7309b48e42cab03e465fb8
CREATE OR REPLACE FUNCTION public.director_approve_min_auto_v1(p_proposal_id text, p_comment text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['director']::text[]);

  perform public.proposal_request_item_integrity_guard_v1(p_proposal_id);
  perform public.director_approve_min_auto(
    p_proposal_id => p_proposal_id,
    p_comment => p_comment
  );
end;
$function$;
revoke all on function public.director_approve_min_auto_v1(text,text) from public,anon;
grant execute on function public.director_approve_min_auto_v1(text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 a88605d4edbfa28120414db9a527acf29938cd82dfb854551361a9c717ba679e
CREATE OR REPLACE FUNCTION public.director_approve_pipeline_v1(p_proposal_id text, p_comment text DEFAULT NULL::text, p_invoice_currency text DEFAULT 'KGS'::text, p_client_mutation_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_proposal_id_text text := nullif(trim(p_proposal_id), '');
  v_proposal_id uuid;
  v_proposal_exists boolean := false;
  v_current_status text := '';
  v_sent_at timestamptz;
  v_purchase_result jsonb;
  v_purchase_id text;
  v_work_seed_ok boolean := true;
  v_work_seed_error text;
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['director']::text[]);

  if v_proposal_id_text is null then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 \043D\0435 \043D\0430\0439\0434\0435\043D\043E',
      'failure_code', 'proposal_id_empty',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  begin
    v_proposal_id := v_proposal_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 \043D\0435 \043D\0430\0439\0434\0435\043D\043E',
      'failure_code', 'proposal_id_invalid',
      'client_mutation_id', p_client_mutation_id
    );
  end;

  select true, trim(coalesce(p.status::text, '')), p.sent_to_accountant_at
  into v_proposal_exists, v_current_status, v_sent_at
  from public.proposals p
  where p.id = v_proposal_id
  limit 1;

  if v_proposal_exists is distinct from true then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 \043D\0435 \043D\0430\0439\0434\0435\043D\043E',
      'failure_code', 'proposal_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  if v_sent_at is not null then
    select pu.id::text into v_purchase_id
    from public.purchases pu
    where pu.proposal_id = v_proposal_id
    order by pu.created_at desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'purchase_id', v_purchase_id,
      'work_seed_ok', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  perform public.proposal_request_item_integrity_guard_v1(v_proposal_id::text);

  perform public.director_approve_min_auto(
    p_proposal_id => v_proposal_id,
    p_comment => p_comment
  );

  begin
    v_purchase_result := public.ensure_purchase_and_incoming_strict(
      p_proposal_id => v_proposal_id
    );
    v_purchase_id := v_purchase_result ->> 'purchase_id';
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := sqlerrm;
    begin
      v_purchase_id := public.ensure_purchase_and_incoming_from_proposal(
        p_proposal_id => v_proposal_id
      )::text;
    exception when others then
      v_work_seed_error := coalesce(v_work_seed_error, '') || '; fallback: ' || sqlerrm;
    end;
  end;

  begin
    perform public.director_send_to_accountant(
      p_proposal_id => v_proposal_id
    );
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := coalesce(v_work_seed_error, '') || '; send_to_accountant: ' || sqlerrm;
  end;

  return jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'work_seed_ok', v_work_seed_ok,
    'work_seed_error', v_work_seed_error,
    'idempotent_replay', false,
    'client_mutation_id', p_client_mutation_id
  );
end;
$function$;
revoke all on function public.director_approve_pipeline_v1(text,text,text,text) from public,anon;
grant execute on function public.director_approve_pipeline_v1(text,text,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 d6f218f6e82058ac645f0dfcc39603a7b81c47c6db0038ae02eb95e934b70893
CREATE OR REPLACE FUNCTION public.director_approve_request_v1(p_request_id text, p_client_mutation_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request_exists boolean := false;
  v_current_status text := '';
  v_current_status_norm text := '';
  v_items_affected integer := 0;
  v_target_status public.request_status_enum :=
    U&'\041A \0437\0430\043A\0443\043F\043A\0435'::public.request_status_enum;
begin
  perform public.office_require_document_role_v1('request',p_request_id::text,array['director']::text[]);

  select true, trim(coalesce(r.status::text, ''))
  into v_request_exists, v_current_status
  from public.requests r
  where r.id::text = p_request_id::text
  limit 1;

  if v_request_exists is distinct from true then
    return jsonb_build_object(
      'ok', false,
      'failure_message', U&'\0417\0430\044F\0432\043A\0430 \043D\0435 \043D\0430\0439\0434\0435\043D\0430',
      'failure_code', 'request_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  v_current_status_norm := lower(regexp_replace(trim(coalesce(v_current_status, '')), '\s+', ' ', 'g'));

  if v_current_status_norm in (
    'approved',
    'sent',
    'to_purchase',
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430',
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E',
    U&'\043A \0437\0430\043A\0443\043F\043A\0435'
  ) then
    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  update public.request_items ri
  set
    status = v_target_status,
    updated_at = now()
  where ri.request_id::text = p_request_id::text
    and lower(trim(coalesce(ri.status::text, ''))) not in (
      'rejected',
      'cancelled',
      'canceled',
      U&'\043E\0442\043A\043B\043E\043D\0435\043D\0430',
      U&'\043E\0442\043A\043B\043E\043D\0435\043D\043E',
      U&'\043E\0442\043C\0435\043D\0435\043D\0430',
      U&'\043E\0442\043C\0435\043D\0435\043D\043E'
    );

  get diagnostics v_items_affected = row_count;

  update public.requests
  set
    status = v_target_status,
    updated_at = now()
  where id::text = p_request_id::text;

  return jsonb_build_object(
    'ok', true,
    'items_approved', v_items_affected,
    'client_mutation_id', p_client_mutation_id
  );
end;
$function$;
revoke all on function public.director_approve_request_v1(text,text) from public,anon;
grant execute on function public.director_approve_request_v1(text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 b081bb276485a4aa02b3aafa721c1a9fcdeae8e5be44799bc9613b1d4cc5e5dd
CREATE OR REPLACE FUNCTION public.director_send_to_accountant(p_proposal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  perform public.office_require_document_role_v1('proposal',p_proposal_id::text,array['director']::text[]);

  -- тоже НЕ трогаем status
  update public.proposals p
  set
    payment_status        = 'К оплате',
    sent_to_accountant_at = coalesce(p.sent_to_accountant_at, now())
  where p.id = p_proposal_id;

  if not found then
    raise exception 'director_send_to_accountant: proposal % not found', p_proposal_id;
  end if;
end;
$function$;
revoke all on function public.director_send_to_accountant(uuid) from public,anon;
grant execute on function public.director_send_to_accountant(uuid) to authenticated,service_role;

-- Reviewed preimage SHA256 6d5236ead5574b99d86678a9fa182619927b6ff17530106b6405eb646d147658
CREATE OR REPLACE FUNCTION public.list_accountant_inbox_fact(p_tab text DEFAULT NULL::text)
 RETURNS SETOF jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select to_jsonb(t)
  from (
    select
      x.*,

      -- ✅ нормальный номер предложения
      p.proposal_no,

      -- ✅ дата утверждения директором (факт)
      p.approved_at as director_approved_at,

      -- ✅ факт оплат (min/max paid_at)
      f.paid_first_at,
      f.paid_last_at

    from v_accountant_inbox_v2 x
    left join proposals p
      on p.id = x.proposal_id
    left join v_proposal_payments_fact f
      on f.proposal_id = x.proposal_id

    where public.office_proposal_role_allowed_v1(x.proposal_id,array['director','accountant']::text[])
      and (p_tab is null or x.payment_status = p_tab)
    order by x.sent_to_accountant_at desc nulls last
  ) t;
$function$;
revoke all on function public.list_accountant_inbox_fact(text) from public,anon;
grant execute on function public.list_accountant_inbox_fact(text) to authenticated,service_role;

-- Reviewed preimage SHA256 786859c24496f73c6bb7f27ac4dc5d2db75be85ac8d02f55d05ad3672795f537
CREATE OR REPLACE FUNCTION public.proposal_create()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  insert into public.proposals default values returning id into v_id;
  return v_id;
end$function$;
revoke all on function public.proposal_create() from public,anon;
grant execute on function public.proposal_create() to authenticated,service_role;

-- Reviewed preimage SHA256 589acda318082e5e5d90f62e6fc32c9d9ab3e450d215a805b523bb1cf6bf2dd6
CREATE OR REPLACE FUNCTION public.request_create_draft()
 RETURNS requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_row public.requests;
begin
    insert into public.requests(status)
    values ('Черновик')
    returning * into v_row;

    return v_row;
end;
$function$;
revoke all on function public.request_create_draft() from public,anon;
grant execute on function public.request_create_draft() to authenticated,service_role;

-- Reviewed preimage SHA256 19f1bfa165bcb49b632e1340a4dbe8a0eb5f836eee208b8d869d5907ad63a7a4
CREATE OR REPLACE FUNCTION public.request_create_draft(p_foreman_name text DEFAULT NULL::text, p_need_by date DEFAULT NULL::date, p_comment text DEFAULT NULL::text, p_object_type_code text DEFAULT NULL::text, p_level_code text DEFAULT NULL::text, p_system_code text DEFAULT NULL::text, p_zone_code text DEFAULT NULL::text)
 RETURNS requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_year integer := extract(year from coalesce(p_need_by::timestamp with time zone, now()))::int;
  v_seq integer;
  v_display text;
  v_row public.requests;
begin
  select next_no.seq, next_no.display_no
    into v_seq, v_display
  from public.fn_next_request_number(v_year) as next_no;

  insert into public.requests as r (
    id,
    status,
    year,
    seq,
    display_no,
    foreman_name,
    need_by,
    comment,
    object_type_code,
    level_code,
    system_code,
    zone_code
  )
  values (
    gen_random_uuid(),
    'Черновик',
    v_year,
    v_seq,
    v_display,
    trim(nullif(p_foreman_name, '')),
    p_need_by,
    nullif(p_comment, ''),
    nullif(p_object_type_code, ''),
    nullif(p_level_code, ''),
    nullif(p_system_code, ''),
    nullif(p_zone_code, '')
  )
  returning r.* into v_row;

  return v_row;
end;
$function$;
revoke all on function public.request_create_draft(text,date,text,text,text,text,text) from public,anon;
grant execute on function public.request_create_draft(text,date,text,text,text,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 7a9a836b359b2790ff861b6f02913449aa1bc028bafbf7ffeb4aafd757169f47
CREATE OR REPLACE FUNCTION public.request_create_draft_numbered(p_foreman_name text, p_need_by text, p_comment text, p_object_type_code text, p_level_code text, p_system_code text, p_zone_code text)
 RETURNS requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year int := extract(year from now())::int;
  v_seq  int;
  v_row  public.requests;
BEGIN
  -- следующий порядковый номер в этом году
  SELECT COALESCE(MAX(seq), 0) + 1
  INTO v_seq
  FROM public.requests
  WHERE year = v_year;

  INSERT INTO public.requests (
    status,
    foreman_name,
    need_by,
    comment,
    object_type_code,
    level_code,
    system_code,
    zone_code,
    year,
    seq,
    display_no
  )
  VALUES (
    'Черновик',
    NULLIF(p_foreman_name, '')::text,
    NULLIF(p_need_by, '')::date,
    NULLIF(p_comment, '')::text,
    NULLIF(p_object_type_code, '')::text,
    NULLIF(p_level_code, '')::text,
    NULLIF(p_system_code, '')::text,
    NULLIF(p_zone_code, '')::text,
    v_year,
    v_seq,
    format('REQ-%s/%s', lpad(v_seq::text, 4, '0'), v_year::text)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
revoke all on function public.request_create_draft_numbered(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.request_create_draft_numbered(text,text,text,text,text,text,text) to authenticated,service_role;

-- Reviewed preimage SHA256 6c5c9cf1103ac22a985c871a4e4045bcfebc96e000fbebff8cc953433a9bc976
CREATE OR REPLACE FUNCTION public.request_create_header(p_object_id uuid, p_desired date, p_comment text)
 RETURNS requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare out_row public.requests%rowtype;
begin
  -- вносим только то, что точно есть у тебя в таблице
  insert into public.requests(object_id, status, comment)
  values (p_object_id, 'На утверждении', p_comment)
  returning * into out_row;

  -- если у тебя ЕСТЬ колонка desired_at – раскомментируй эти 2 строки:
  -- if p_desired is not null then
  --   update public.requests set desired_at = p_desired where id = out_row.id returning * into out_row;
  -- end if;

  return out_row;
end
$function$;
revoke all on function public.request_create_header(uuid,date,text) from public,anon;
grant execute on function public.request_create_header(uuid,date,text) to authenticated,service_role;

-- Reviewed preimage SHA256 e4ab7608b7397910f4d7f7c1561d86357193136917432ce9c593d43f5058bf5d
CREATE OR REPLACE FUNCTION public.request_create_min()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.requests(status, created_at) VALUES ('Черновик', now())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;
revoke all on function public.request_create_min() from public,anon;
grant execute on function public.request_create_min() to authenticated,service_role;
