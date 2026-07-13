begin;

do $$
begin
  if to_regprocedure('public.pdf_director_finance_source_v1(text,text,integer,integer)') is not null then
    alter function public.pdf_director_finance_source_v1(text, text, integer, integer)
      security definer
      set search_path = public;

    grant execute on function public.pdf_director_finance_source_v1(text, text, integer, integer) to authenticated;
  end if;

  if to_regprocedure('public.pdf_director_production_source_v1(text,text,text,boolean)') is not null then
    alter function public.pdf_director_production_source_v1(text, text, text, boolean)
      security definer
      set search_path = public;

    grant execute on function public.pdf_director_production_source_v1(text, text, text, boolean) to authenticated;
  end if;

  if to_regprocedure('public.pdf_director_subcontract_source_v1(text,text,text)') is not null then
    alter function public.pdf_director_subcontract_source_v1(text, text, text)
      security definer
      set search_path = public;

    grant execute on function public.pdf_director_subcontract_source_v1(text, text, text) to authenticated;
  end if;
end;
$$;

commit;
