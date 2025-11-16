-- db/20240529_request_item_update_qty.sql
-- Возможность обновлять количество позиции заявки в черновике

begin;

create or replace function public.request_item_update_qty(
  p_request_item_id uuid,
  p_qty numeric
)
returns public.request_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.request_items;
  v_request public.requests;
begin
  if p_request_item_id is null then
    raise exception 'request_item_update_qty: id is required';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'request_item_update_qty: qty must be positive';
  end if;

  select *
    into v_item
  from public.request_items
  where id = p_request_item_id
  for update;

  if not found then
    raise exception 'request_item_update_qty: item % not found', p_request_item_id;
  end if;

  select *
    into v_request
  from public.requests
  where id = v_item.request_id;

  if not found then
    raise exception 'request_item_update_qty: request % not found', v_item.request_id;
  end if;

  if lower(coalesce(v_request.status, '')) not in ('draft', 'черновик') then
    raise exception 'request_item_update_qty: request % is not editable', v_request.id;
  end if;

  update public.request_items
     set qty = p_qty
   where id = p_request_item_id
   returning * into v_item;

  return v_item;
end;
$$;

commit;
