begin;

alter table public.subcontracts
  add column if not exists contractor_inn text null;

create or replace function public.subcontract_create_v1(
  p_created_by text,
  p_foreman_name text default null,
  p_contractor_org text default null,
  p_contractor_inn text default null,
  p_contractor_rep text default null,
  p_contractor_phone text default null,
  p_contract_number text default null,
  p_contract_date date default null,
  p_object_name text default null,
  p_work_zone text default null,
  p_work_type text default null,
  p_qty_planned numeric default null,
  p_uom text default null,
  p_date_start date default null,
  p_date_end date default null,
  p_work_mode text default null,
  p_price_per_unit numeric default null,
  p_total_price numeric default null,
  p_price_type text default null,
  p_foreman_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
  v_year integer := extract(year from now())::int;
  v_seq integer;
  v_display text;
  v_row public.subcontracts;
begin
  begin
    v_created_by := nullif(trim(coalesce(p_created_by, '')), '')::uuid;
  exception
    when others then
      return jsonb_build_object(
        'ok', false,
        'failure_code', 'invalid_created_by',
        'failure_message', 'subcontract create requires a valid created_by user id'
      );
  end;

  if v_created_by is null then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'invalid_created_by',
      'failure_message', 'subcontract create requires a valid created_by user id'
    );
  end if;

  select n.seq, n.display_no
    into v_seq, v_display
  from public.fn_next_subcontract_number(v_year) n;

  insert into public.subcontracts (
    id,
    created_by,
    status,
    year,
    seq,
    display_no,
    foreman_name,
    contractor_org,
    contractor_inn,
    contractor_rep,
    contractor_phone,
    contract_number,
    contract_date,
    object_name,
    work_zone,
    work_type,
    qty_planned,
    uom,
    date_start,
    date_end,
    work_mode,
    price_per_unit,
    total_price,
    price_type,
    foreman_comment
  )
  values (
    gen_random_uuid(),
    v_created_by,
    'draft',
    v_year,
    v_seq,
    v_display,
    nullif(trim(p_foreman_name), ''),
    nullif(trim(p_contractor_org), ''),
    nullif(trim(p_contractor_inn), ''),
    nullif(trim(p_contractor_rep), ''),
    nullif(trim(p_contractor_phone), ''),
    nullif(trim(p_contract_number), ''),
    p_contract_date,
    nullif(trim(p_object_name), ''),
    nullif(trim(p_work_zone), ''),
    nullif(trim(p_work_type), ''),
    p_qty_planned,
    nullif(trim(p_uom), ''),
    p_date_start,
    p_date_end,
    nullif(trim(p_work_mode), ''),
    p_price_per_unit,
    p_total_price,
    nullif(trim(p_price_type), ''),
    nullif(trim(p_foreman_comment), '')
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'path', 'created',
    'subcontract', jsonb_build_object(
      'id', v_row.id,
      'display_no', v_row.display_no,
      'status', v_row.status,
      'contractor_inn', v_row.contractor_inn
    )
  );
end;
$$;

create or replace function public.subcontract_approve_v1(
  p_subcontract_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subcontract_id uuid;
  v_row public.subcontracts;
begin
  begin
    v_subcontract_id := nullif(trim(coalesce(p_subcontract_id, '')), '')::uuid;
  exception
    when others then
      return jsonb_build_object(
        'ok', false,
        'failure_code', 'invalid_subcontract_id',
        'failure_message', 'subcontract approve requires a valid subcontract id'
      );
  end;

  if v_subcontract_id is null then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'invalid_subcontract_id',
      'failure_message', 'subcontract approve requires a valid subcontract id'
    );
  end if;

  select *
    into v_row
  from public.subcontracts
  where id = v_subcontract_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'not_found',
      'failure_message', 'subcontract approve target not found'
    );
  end if;

  if v_row.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'mutation_path', 'already_approved',
      'subcontract', jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'approved_at', v_row.approved_at
      )
    );
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'invalid_status',
      'failure_message', 'subcontract approve is only allowed from pending status',
      'current_status', v_row.status,
      'subcontract', jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'approved_at', v_row.approved_at,
        'rejected_at', v_row.rejected_at
      )
    );
  end if;

  update public.subcontracts
  set
    status = 'approved',
    approved_at = coalesce(approved_at, now())
  where id = v_subcontract_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'mutation_path', 'approved',
    'subcontract', jsonb_build_object(
      'id', v_row.id,
      'status', v_row.status,
      'approved_at', v_row.approved_at
    )
  );
end;
$$;

create or replace function public.subcontract_reject_v1(
  p_subcontract_id text,
  p_director_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subcontract_id uuid;
  v_row public.subcontracts;
begin
  begin
    v_subcontract_id := nullif(trim(coalesce(p_subcontract_id, '')), '')::uuid;
  exception
    when others then
      return jsonb_build_object(
        'ok', false,
        'failure_code', 'invalid_subcontract_id',
        'failure_message', 'subcontract reject requires a valid subcontract id'
      );
  end;

  if v_subcontract_id is null then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'invalid_subcontract_id',
      'failure_message', 'subcontract reject requires a valid subcontract id'
    );
  end if;

  select *
    into v_row
  from public.subcontracts
  where id = v_subcontract_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'not_found',
      'failure_message', 'subcontract reject target not found'
    );
  end if;

  if v_row.status = 'rejected' then
    return jsonb_build_object(
      'ok', true,
      'mutation_path', 'already_rejected',
      'subcontract', jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'director_comment', v_row.director_comment,
        'rejected_at', v_row.rejected_at
      )
    );
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'failure_code', 'invalid_status',
      'failure_message', 'subcontract reject is only allowed from pending status',
      'current_status', v_row.status,
      'subcontract', jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'approved_at', v_row.approved_at,
        'rejected_at', v_row.rejected_at
      )
    );
  end if;

  update public.subcontracts
  set
    status = 'rejected',
    director_comment = nullif(trim(p_director_comment), ''),
    rejected_at = coalesce(rejected_at, now())
  where id = v_subcontract_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'mutation_path', 'rejected',
    'subcontract', jsonb_build_object(
      'id', v_row.id,
      'status', v_row.status,
      'director_comment', v_row.director_comment,
      'rejected_at', v_row.rejected_at
    )
  );
end;
$$;

grant execute on function public.subcontract_create_v1(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  numeric,
  text,
  date,
  date,
  text,
  numeric,
  numeric,
  text,
  text
) to authenticated;

grant execute on function public.subcontract_approve_v1(text) to authenticated;
grant execute on function public.subcontract_reject_v1(text, text) to authenticated;

commit;
