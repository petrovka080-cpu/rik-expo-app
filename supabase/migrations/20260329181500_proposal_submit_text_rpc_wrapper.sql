begin;

create or replace function public.proposal_submit_text_v1(p_proposal_id_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.proposal_submit(p_proposal_id => p_proposal_id_text::text);
end;
$$;

comment on function public.proposal_submit_text_v1(text) is
'Unambiguous canonical wrapper for proposal_submit over PostgREST. Forces the text variant to avoid int8/text overload ambiguity on buyer submit.';

grant execute on function public.proposal_submit_text_v1(text) to authenticated;

commit;
