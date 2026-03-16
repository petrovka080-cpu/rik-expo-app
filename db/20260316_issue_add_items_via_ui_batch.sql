create or replace function public.issue_add_items_via_ui(
  p_issue_id bigint,
  p_lines jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record;
  v_count integer := 0;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'p_lines must be a json array';
  end if;

  for v_line in
    select
      t.rik_code,
      t.uom_id,
      t.qty,
      t.request_item_id
    from jsonb_to_recordset(p_lines) as t(
      rik_code text,
      uom_id text,
      qty numeric,
      request_item_id uuid
    )
  loop
    perform public.issue_add_item_via_ui(
      p_issue_id := p_issue_id,
      p_rik_code := v_line.rik_code,
      p_uom_id := v_line.uom_id,
      p_qty := v_line.qty,
      p_request_item_id := v_line.request_item_id
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
