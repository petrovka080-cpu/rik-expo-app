begin;

create or replace function public.director_report_fetch_acc_issue_lines_v1(
  p_issue_ids bigint[]
)
returns table (
  issue_id bigint,
  rik_code text,
  uom text,
  name_human text,
  qty_total numeric,
  qty_in_req numeric,
  qty_over numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    lines.issue_id::bigint as issue_id,
    lines.rik_code::text as rik_code,
    lines.uom::text as uom,
    lines.name_human::text as name_human,
    lines.qty_total::numeric as qty_total,
    lines.qty_in_req::numeric as qty_in_req,
    lines.qty_over::numeric as qty_over
  from unnest(coalesce(p_issue_ids, '{}'::bigint[])) as issue_ids(issue_id)
  cross join lateral public.acc_report_issue_lines(issue_ids.issue_id) as lines
  order by lines.issue_id asc, lines.rik_code asc nulls last, lines.uom asc nulls last;
$$;

comment on function public.director_report_fetch_acc_issue_lines_v1(bigint[]) is
  'Backend batch wrapper for acc_report_issue_lines preserving legacy line semantics while removing client-side per-issue waterfall.';

grant execute on function public.director_report_fetch_acc_issue_lines_v1(bigint[]) to authenticated;

commit;
