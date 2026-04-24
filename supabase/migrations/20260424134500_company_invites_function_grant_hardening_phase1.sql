begin;

revoke all on function public.company_invites_actor_can_view_company_v1(uuid) from public, anon, authenticated;
grant execute on function public.company_invites_actor_can_view_company_v1(uuid) to authenticated, service_role;

revoke all on function public.company_invites_actor_can_manage_company_v1(uuid) from public, anon, authenticated;
grant execute on function public.company_invites_actor_can_manage_company_v1(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
