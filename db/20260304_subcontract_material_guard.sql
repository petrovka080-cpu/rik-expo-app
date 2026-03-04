-- db/20260304_subcontract_material_guard.sql
-- PROD guard: material write-off is enforced on subcontract level (not per work).
-- Prevents double-spend in parallel requests via advisory transaction lock.

begin;

create or replace function public.fn_guard_subcontract_material_available()
returns trigger
language plpgsql
as $$
declare
  v_log_progress_id text;
  v_wp_json jsonb;
  v_subcontract_id uuid;
  v_mat_code text;
  v_issued numeric := 0;
  v_used_total numeric := 0;
  v_used_excluding_current numeric := 0;
  v_available_now numeric := 0;
  v_new_qty numeric := 0;
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    return new;
  end if;

  v_new_qty := coalesce(new.qty_fact, 0);
  if v_new_qty < 0 then
    raise exception 'qty_fact cannot be negative'
      using errcode = '22023';
  end if;

  v_mat_code := upper(trim(coalesce(new.mat_code, '')));
  if v_mat_code = '' then
    return new;
  end if;

  -- Resolve progress id from log.
  select l.progress_id::text
    into v_log_progress_id
  from public.work_progress_log l
  where l.id = new.log_id
  limit 1;

  if coalesce(v_log_progress_id, '') = '' then
    return new;
  end if;

  -- Resolve subcontract via json to stay backward-compatible with schema variants:
  -- work_progress.contractor_job_id OR work_progress.subcontract_id.
  select to_jsonb(wp)
    into v_wp_json
  from public.work_progress wp
  where wp.id::text = v_log_progress_id
  limit 1;

  if v_wp_json is null then
    return new;
  end if;

  v_subcontract_id := coalesce(
    case
      when coalesce(v_wp_json->>'contractor_job_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (v_wp_json->>'contractor_job_id')::uuid
      else null
    end,
    case
      when coalesce(v_wp_json->>'subcontract_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (v_wp_json->>'subcontract_id')::uuid
      else null
    end
  );

  -- If this log is not linked to subcontract flow, do not block legacy paths.
  if v_subcontract_id is null then
    return new;
  end if;

  -- Serialize concurrent writes for same subcontract+material.
  perform pg_advisory_xact_lock(hashtext(v_subcontract_id::text || '|' || v_mat_code));

  -- Total issued on subcontract (all requests linked to this subcontract).
  select coalesce(sum(i.qty_issued), 0)
    into v_issued
  from public.v_wh_issue_req_items_ui i
  join public.requests r
    on r.id = i.request_id
  where coalesce(r.subcontract_id, r.contractor_job_id) = v_subcontract_id
    and upper(trim(coalesce(i.rik_code, ''))) = v_mat_code;

  -- Total already used on subcontract across ALL works/logs.
  select coalesce(sum(m.qty_fact), 0)
    into v_used_total
  from public.work_progress_log_materials m
  join public.work_progress_log l
    on l.id = m.log_id
  join public.work_progress wp
    on wp.id::text = l.progress_id::text
  where coalesce(
          case when coalesce(to_jsonb(wp)->>'contractor_job_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then (to_jsonb(wp)->>'contractor_job_id')::uuid else null end,
          case when coalesce(to_jsonb(wp)->>'subcontract_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then (to_jsonb(wp)->>'subcontract_id')::uuid else null end
        ) = v_subcontract_id
    and upper(trim(coalesce(m.mat_code, ''))) = v_mat_code;

  -- In BEFORE UPDATE current row is still in table with OLD value.
  v_used_excluding_current := v_used_total;
  if tg_op = 'UPDATE' and upper(trim(coalesce(old.mat_code, ''))) = v_mat_code then
    v_used_excluding_current := greatest(0, v_used_total - coalesce(old.qty_fact, 0));
  end if;

  v_available_now := greatest(0, v_issued - v_used_excluding_current);

  if v_new_qty > v_available_now then
    raise exception 'Material % exceeds subcontract available qty. available=%, requested=%',
      v_mat_code, v_available_now, v_new_qty
      using errcode = 'P0001',
            hint = 'Materials are guarded at subcontract level. Requested quantity cannot exceed current available balance.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_subcontract_material_available on public.work_progress_log_materials;
create trigger trg_guard_subcontract_material_available
before insert or update of mat_code, qty_fact, log_id
on public.work_progress_log_materials
for each row
execute function public.fn_guard_subcontract_material_available();

commit;

