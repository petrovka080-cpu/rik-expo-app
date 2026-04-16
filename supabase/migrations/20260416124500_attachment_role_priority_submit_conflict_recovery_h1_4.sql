begin;

create or replace function public.proposal_attachment_actor_role_v1(
  p_fallback_role text default null
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := null;
begin
  if auth.uid() is not null then
    select nullif(lower(trim(p.role)), '')
    into v_role
    from public.profiles p
    where p.user_id = auth.uid()
      and lower(trim(coalesce(p.role, ''))) in ('buyer', 'director', 'accountant')
    order by case lower(trim(p.role))
      when 'buyer' then 1
      when 'director' then 2
      when 'accountant' then 3
      else 99
    end
    limit 1;

    if v_role is null then
      select nullif(lower(trim(cm.role)), '')
      into v_role
      from public.company_members cm
      where cm.user_id = auth.uid()
        and lower(trim(coalesce(cm.role, ''))) in ('buyer', 'director', 'accountant')
      order by case lower(trim(cm.role))
        when 'buyer' then 1
        when 'director' then 2
        when 'accountant' then 3
        else 99
      end
      limit 1;
    end if;

    if v_role is null then
      v_role := nullif(lower(trim(coalesce(public.get_my_role(), ''))), '');
    end if;

    if v_role is null then
      select nullif(lower(trim(p.role)), '')
      into v_role
      from public.profiles p
      where p.user_id = auth.uid()
        and nullif(trim(p.role), '') is not null
      limit 1;
    end if;

    if v_role is null then
      select nullif(lower(trim(cm.role)), '')
      into v_role
      from public.company_members cm
      where cm.user_id = auth.uid()
        and nullif(trim(cm.role), '') is not null
      order by case lower(trim(cm.role))
        when 'buyer' then 1
        when 'director' then 2
        when 'accountant' then 3
        else 99
      end
      limit 1;
    end if;
  end if;

  return coalesce(v_role, nullif(lower(trim(p_fallback_role)), ''));
end;
$$;

comment on function public.proposal_attachment_actor_role_v1(text) is
'H1.4 recovery: resolves attachment role from explicit buyer/director/accountant profile or membership before contractor compatibility fallback from get_my_role().';

grant execute on function public.proposal_attachment_actor_role_v1(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
