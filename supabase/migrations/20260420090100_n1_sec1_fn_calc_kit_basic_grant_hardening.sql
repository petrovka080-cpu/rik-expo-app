-- N1.SEC1: harden fn_calc_kit_basic privileged surface.
-- Scope: public.fn_calc_kit_basic(text, numeric, numeric, numeric, numeric, numeric, numeric, numeric).
-- Only revoke unauthenticated execute and pin the function search_path.

revoke execute on function public.fn_calc_kit_basic(
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
) from anon;

alter function public.fn_calc_kit_basic(
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric
) set search_path = public;
