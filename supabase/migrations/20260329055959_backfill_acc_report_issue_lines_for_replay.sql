begin;

do $$
begin
  if to_regprocedure('public.acc_report_issue_lines(bigint)') is null then
    execute $fn$
      create function public.acc_report_issue_lines(p_issue_id bigint)
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
      as $body$
        select
          p_issue_id::bigint as issue_id,
          null::text as rik_code,
          null::text as uom,
          null::text as name_human,
          0::numeric as qty_total,
          0::numeric as qty_in_req,
          0::numeric as qty_over
        where false;
      $body$;
    $fn$;
  end if;
end;
$$;

comment on function public.acc_report_issue_lines(bigint) is
'Compatibility empty acc_report_issue_lines RPC for local replayability when remote history placeholders did not recreate the original director report accounting source. Created only when absent.';

grant execute on function public.acc_report_issue_lines(bigint) to authenticated;

commit;
