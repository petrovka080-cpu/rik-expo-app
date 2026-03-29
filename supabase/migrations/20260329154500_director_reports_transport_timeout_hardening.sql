begin;

alter function public.director_report_fetch_issue_price_scope_v1(text[], text[], boolean)
  set statement_timeout = '30s';

alter function public.director_report_fetch_works_v1(date, date, text, boolean)
  set statement_timeout = '30s';

alter function public.director_report_transport_scope_v1(date, date, text, boolean, boolean)
  set statement_timeout = '30s';

commit;
