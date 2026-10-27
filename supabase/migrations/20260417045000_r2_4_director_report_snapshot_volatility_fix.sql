begin;

alter function public.director_report_fetch_works_from_facts_v1(date, date, text, boolean)
  volatile;

alter function public.director_report_works_snapshot_drift_v1(date, date, text, boolean)
  volatile;

comment on function public.director_report_fetch_works_from_facts_v1(date, date, text, boolean) is
'R2.4 preserved facts-path implementation of Director works report. Volatile because R2.3 fact scope records runtime metrics while preserving report semantics.';

comment on function public.director_report_works_snapshot_drift_v1(date, date, text, boolean) is
'R2.4 compares Director works snapshot payload with preserved facts-path payload. Volatile because the preserved facts path records runtime metrics.';

notify pgrst, 'reload schema';

commit;
