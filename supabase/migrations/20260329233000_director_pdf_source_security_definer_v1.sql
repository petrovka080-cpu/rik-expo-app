begin;

alter function public.pdf_director_finance_source_v1(text, text, integer, integer)
  security definer
  set search_path = public;

alter function public.pdf_director_production_source_v1(text, text, text, boolean)
  security definer
  set search_path = public;

alter function public.pdf_director_subcontract_source_v1(text, text, text)
  security definer
  set search_path = public;

grant execute on function public.pdf_director_finance_source_v1(text, text, integer, integer) to authenticated;
grant execute on function public.pdf_director_production_source_v1(text, text, text, boolean) to authenticated;
grant execute on function public.pdf_director_subcontract_source_v1(text, text, text) to authenticated;

commit;
