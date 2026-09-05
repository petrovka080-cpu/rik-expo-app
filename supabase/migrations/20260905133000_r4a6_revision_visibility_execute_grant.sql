begin;

do $migration$
begin
  if to_regprocedure('public.estimate_revision_visible_v1(uuid)') is null then
    raise exception using
      errcode = 'P0002',
      message = 'estimate_revision_visible_v1 predecessor is required';
  end if;
end;
$migration$;

-- RLS policies on canonical revision rows, artifacts, and photo records call
-- this fail-closed helper while running as the authenticated requester. The
-- R5.4.1 hardening revoked the implicit PUBLIC grant; restore only the role
-- that must evaluate those policies and keep anonymous execution denied.
revoke all on function public.estimate_revision_visible_v1(uuid) from public, anon;
grant execute on function public.estimate_revision_visible_v1(uuid) to authenticated;

comment on function public.estimate_revision_visible_v1(uuid) is
'R4-A6 canonical revision visibility boundary. Executable by authenticated requesters for RLS evaluation; anonymous access remains revoked.';

commit;
