-- N1.SEC1: harden fn_calc_kit_basic privileged surface.
-- Scope: public.fn_calc_kit_basic(text, numeric, numeric, numeric, numeric, numeric, numeric, numeric).
-- Only revoke unauthenticated execute and pin the function search_path.

begin;

do $$
begin
  if to_regprocedure('public.fn_calc_kit_basic(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric)') is not null then
    execute $revoke$
      revoke execute on function public.fn_calc_kit_basic(
        text,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric
      ) from anon
    $revoke$;

    execute $alter$
      alter function public.fn_calc_kit_basic(
        text,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric,
        numeric
      ) set search_path = public
    $alter$;
  end if;
end;
$$;

commit;
