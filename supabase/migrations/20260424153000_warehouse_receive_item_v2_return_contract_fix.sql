-- WAVE 2B follow-up: wh_receive_item_v2 already performs the canonical receive
-- mutation, but it exits with bare RETURN statements. For a RETURNS TABLE
-- function that means the wrapper sees zero rows, so wh_receive_apply_ui raises
-- line_failed after the stock side effect has already happened. Preserve the
-- existing receive semantics and emit the expected row contract explicitly.

create or replace function public.wh_receive_item_v2(
  p_incoming_item_id uuid,
  p_qty numeric,
  p_note text default null
)
returns table(
  ok boolean,
  qty_taken numeric,
  qty_left numeric,
  incoming_status text
)
language plpgsql
security definer
as $$
declare
  v_incoming_id uuid;
  v_expected numeric := 0;
  v_received numeric := 0;
  v_left numeric := 0;
  v_take numeric := 0;

  v_rik_code text;
  v_uom text;
  v_request_item_id uuid;
  v_purchase_id uuid;
  v_object_id uuid;
begin
  select wii.incoming_id,
         coalesce(wii.qty_expected, 0),
         coalesce(wii.qty_received, 0)
    into v_incoming_id, v_expected, v_received
  from public.wh_incoming_items wii
  where wii.id = p_incoming_item_id
  for update;

  if v_incoming_id is null then
    raise exception 'Позиция прихода % не найдена', p_incoming_item_id;
  end if;

  v_left := greatest(v_expected - v_received, 0);

  if p_qty is null or p_qty <= 0 then
    v_take := v_left;
  else
    v_take := least(p_qty, v_left);
  end if;

  if v_take <= 0 then
    ok := false;
    qty_taken := 0;
    qty_left := v_left;
    incoming_status := (select status from public.wh_incoming where id = v_incoming_id);
    return next;
    return;
  end if;

  update public.wh_incoming_items wii
     set qty_received = coalesce(wii.qty_received, 0) + v_take
   where wii.id = p_incoming_item_id;

  update public.wh_incoming wi
     set status = 'confirmed',
         confirmed_at = now()
   where wi.id = v_incoming_id
     and not exists (
       select 1 from public.wh_incoming_items i
       where i.incoming_id = wi.id
         and coalesce(i.qty_received, 0) < coalesce(i.qty_expected, 0)
     );

  begin
    select
      coalesce(ri.rik_code, pi.rik_code, pi.ref_id) as rk,
      coalesce(ri.uom, wii.uom) as uom,
      pi.request_item_id,
      pi.purchase_id,
      pu.object_id
    into
      v_rik_code,
      v_uom,
      v_request_item_id,
      v_purchase_id,
      v_object_id
    from public.wh_incoming_items wii
    join public.purchase_items pi on pi.id = wii.purchase_item_id
    join public.purchases pu on pu.id = pi.purchase_id
    left join public.request_items ri on ri.id = pi.request_item_id
    where wii.id = p_incoming_item_id;
  exception
    when others then
      v_rik_code := null;
  end;

  if v_rik_code is not null and v_take > 0 then
    insert into public.wh_moves(
      move_id,
      object_id,
      request_item_id,
      rik_code,
      uom,
      qty,
      direction,
      moved_at,
      incoming_id,
      purchase_id,
      issue_id,
      stage_id,
      note
    )
    values (
      gen_random_uuid(),
      v_object_id,
      v_request_item_id,
      v_rik_code,
      v_uom,
      v_take,
      'in',
      now(),
      v_incoming_id,
      v_purchase_id,
      null,
      null,
      coalesce(p_note, 'Приход wh_receive_item_v2')
    );
  end if;

  ok := true;
  qty_taken := v_take;
  qty_left := greatest(v_expected - (v_received + v_take), 0);
  incoming_status := (select status from public.wh_incoming where id = v_incoming_id);
  return next;
  return;
end;
$$;

comment on function public.wh_receive_item_v2(uuid, numeric, text) is
  'WAVE 2B return-contract fix: preserves canonical warehouse receive semantics while emitting an explicit row for wrapper callers.';
