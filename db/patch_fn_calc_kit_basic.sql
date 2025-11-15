-- Скрипт обновляет функцию fn_calc_kit_basic в продакшене Supabase.
-- Выполните этот файл один раз через Supabase SQL Editor перед использованием обновлённого калькулятора прораба.

drop function if exists public.fn_calc_kit_basic(
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
);

create or replace function public.fn_calc_kit_basic(
  p_work_type_code text,
  p_area_m2        numeric,
  p_perimeter_m    numeric,
  p_length_m       numeric,
  p_points         numeric,
  p_volume_m3      numeric,
  p_count          numeric,
  p_multiplier     numeric
)
returns table (
  work_type_code   text,
  rik_code         text,
  section          text,
  uom_code         text,
  basis            text,
  base_coeff       numeric,
  effective_coeff  numeric,
  qty              numeric,
  suggested_qty    numeric,
  packs            numeric,
  pack_size        numeric,
  pack_uom         text,
  hint             text,
  item_name_ru     text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    r.work_type_code,
    r.rik_code,
    r.section::text,
    r.uom_code::text,
    r.basis::text,
    r.base_coeff,
    r.effective_coeff,
    r.qty,
    r.suggested_qty,
    r.packs,
    r.pack_size,
    r.pack_uom,
    r.hint,
    coalesce(
      cw.name_human_ru,
      ci.name_human_ru,
      r.rik_code
    ) as item_name_ru
  from public.fn_calc_kit_basic_ru(
    p_work_type_code,
    p_area_m2,
    p_perimeter_m,
    p_length_m,
    p_points,
    p_volume_m3,
    p_count,
    p_multiplier,
    null -- p_height_m при необходимости
  ) as r
  left join public.catalog_items ci on ci.rik_code = r.rik_code
  left join public.catalog_works cw on cw.rik_code = r.rik_code;
end;
$$;

grant execute on function public.fn_calc_kit_basic(
  text, numeric, numeric, numeric, numeric, numeric, numeric, numeric
) to anon, authenticated;
