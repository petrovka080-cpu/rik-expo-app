create or replace function public.pdf_contractor_work_source_v1(
  p_progress_id uuid,
  p_log_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
with base_work as (
  select
    wp.id as progress_id,
    coalesce(wf.work_code, '') as work_code,
    coalesce(wf.work_name, '') as work_name,
    coalesce(
      sc.object_name,
      req.object_name,
      nullif(concat_ws(' / ', req.object_type_code, req.level_code, req.system_code), ''),
      wf.object_name
    ) as object_name,
    coalesce(wf.uom_id, wp.uom) as uom_id,
    coalesce(wp.qty_planned, wf.qty_planned, 0)::numeric as qty_planned,
    coalesce(wp.qty_done, wf.qty_done, 0)::numeric as qty_done,
    coalesce(
      wp.qty_left,
      wf.qty_left,
      greatest(coalesce(wp.qty_planned, wf.qty_planned, 0) - coalesce(wp.qty_done, wf.qty_done, 0), 0)
    )::numeric as qty_left,
    sc.contractor_org,
    sc.contractor_inn,
    sc.contractor_phone,
    sc.contract_number,
    sc.contract_date,
    sc.work_zone,
    req.level_code,
    coalesce(sc.work_type, wf.work_name, wf.work_code) as work_type,
    coalesce(sc.price_per_unit, pi.price_per_unit, pi.price, 0)::numeric as unit_price,
    sc.total_price,
    sc.date_start,
    sc.date_end
  from work_progress wp
  left join v_works_fact wf on wf.progress_id = wp.id
  left join purchase_items pi on pi.id = wp.purchase_item_id
  left join request_items ri on ri.id = pi.request_item_id
  left join requests req on req.id = ri.request_id
  left join subcontracts sc on sc.id = coalesce(req.contractor_job_id, req.subcontract_id)
  where wp.id = p_progress_id
  limit 1
),
selected_log as (
  select
    log.id,
    log.created_at,
    log.qty,
    log.note,
    log.stage_note,
    log.work_uom
  from work_progress_log log
  where p_log_id is not null
    and log.id = p_log_id
    and log.progress_id = p_progress_id
  limit 1
),
summary_logs as (
  select log.id
  from work_progress_log log
  where log.progress_id = p_progress_id
),
materials_rows as (
  select
    mat.mat_code,
    coalesce(ci.name_human_ru, ci.name_human, mat.mat_code) as name,
    coalesce(ci.uom_code, mat.uom_mat, mat.uom) as uom,
    sum(mat.qty_fact)::numeric as qty_fact
  from work_progress_log_materials mat
  left join catalog_items ci on ci.rik_code = mat.mat_code
  where (
    p_log_id is null and mat.log_id in (select id from summary_logs)
  ) or (
    p_log_id is not null and mat.log_id = p_log_id
  )
  group by mat.mat_code, coalesce(ci.name_human_ru, ci.name_human, mat.mat_code), coalesce(ci.uom_code, mat.uom_mat, mat.uom)
)
select jsonb_build_object(
  'document_type', 'contractor_work_pdf',
  'version', 'v1',
  'mode', case when p_log_id is null then 'summary' else 'history' end,
  'work', (
    select jsonb_build_object(
      'progress_id', bw.progress_id,
      'work_code', bw.work_code,
      'work_name', bw.work_name,
      'object_name', bw.object_name,
      'uom_id', bw.uom_id,
      'qty_planned', bw.qty_planned,
      'qty_done', bw.qty_done,
      'qty_left', bw.qty_left
    )
    from base_work bw
  ),
  'header', (
    select jsonb_build_object(
      'contractor_org', bw.contractor_org,
      'contractor_inn', bw.contractor_inn,
      'contractor_phone', bw.contractor_phone,
      'contract_number', bw.contract_number,
      'contract_date', bw.contract_date,
      'object_name', bw.object_name,
      'work_type', bw.work_type,
      'zone', coalesce(bw.work_zone, bw.level_code),
      'level_name', case when bw.work_zone is not null then null else bw.level_code end,
      'unit_price', bw.unit_price,
      'total_price', bw.total_price,
      'date_start', bw.date_start,
      'date_end', bw.date_end
    )
    from base_work bw
  ),
  'materials', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'mat_code', mr.mat_code,
          'name', mr.name,
          'uom', mr.uom,
          'qty_fact', mr.qty_fact
        )
        order by mr.name, mr.mat_code
      )
      from materials_rows mr
    ),
    '[]'::jsonb
  ),
  'log', (
    select jsonb_build_object(
      'id', sl.id,
      'created_at', sl.created_at,
      'qty', sl.qty,
      'note', sl.note,
      'stage_note', sl.stage_note,
      'work_uom', sl.work_uom
    )
    from selected_log sl
  )
)
from base_work;
$$;

grant execute on function public.pdf_contractor_work_source_v1(uuid, uuid) to authenticated;
