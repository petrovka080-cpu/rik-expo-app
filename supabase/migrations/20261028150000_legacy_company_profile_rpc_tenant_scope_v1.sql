-- Preserve both legacy signatures, but never select a global last company.
-- The internal operation is private; existing RPC overloads keep their contract.
create or replace function public.office_company_profile_save_scoped_v1(
  p_name text, p_inn text, p_legal_address text, p_bank text,
  p_phone text, p_email text, p_site_address text, p_write_site_address boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Company name is required' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text, 9151));

  select cp.id into v_id
  from public.company_profiles cp
  where cp.owner_user_id = v_actor
    or (cp.owner_user_id is null and cp.user_id = v_actor)
    or public.company_invites_actor_can_manage_company_v1(cp.id)
  order by (cp.owner_user_id = v_actor) desc nulls last,
    cp.updated_at desc nulls last, cp.created_at desc nulls last, cp.id
  limit 1 for update;

  if v_id is null then
    insert into public.company_profiles(
      owner_user_id, user_id, name, inn, legal_address, bank, phone, email,
      site_address, created_at, updated_at
    ) values (
      v_actor, v_actor, btrim(p_name), p_inn, p_legal_address, p_bank,
      p_phone, p_email, case when p_write_site_address then p_site_address else null end,
      now(), now()
    ) returning id into v_id;
  else
    update public.company_profiles cp
    set name = btrim(p_name), inn = p_inn, legal_address = p_legal_address,
      bank = p_bank, phone = p_phone, email = p_email,
      site_address = case when p_write_site_address then p_site_address else cp.site_address end,
      updated_at = now()
    where cp.id = v_id;
  end if;
  return v_id;
end;
$function$;
revoke all on function public.office_company_profile_save_scoped_v1(text,text,text,text,text,text,text,boolean)
  from public, anon, authenticated;

create or replace function public.company_save(
  p_name text, p_inn text, p_legal_address text, p_bank text,
  p_phone text, p_email text
)
returns uuid
language sql
security definer
set search_path = ''
as $function$
  select public.office_company_profile_save_scoped_v1(
    p_name, p_inn, p_legal_address, p_bank, p_phone, p_email, null, false
  );
$function$;

create or replace function public.company_save(
  p_name text, p_inn text, p_legal_address text, p_bank text,
  p_phone text, p_email text, p_site_address text
)
returns uuid
language sql
security definer
set search_path = ''
as $function$
  select public.office_company_profile_save_scoped_v1(
    p_name, p_inn, p_legal_address, p_bank, p_phone, p_email, p_site_address, true
  );
$function$;

create or replace function public.company_get_active()
returns table(id uuid, name text, inn text, legal_address text, bank text,
  phone text, email text, site_address text)
language plpgsql
security definer
set search_path = ''
as $function$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return query
  select cp.id, cp.name, cp.inn, cp.legal_address, cp.bank,
    cp.phone, cp.email, cp.site_address
  from public.company_profiles cp
  where cp.owner_user_id = v_actor
    or (cp.owner_user_id is null and cp.user_id = v_actor)
    or public.company_invites_actor_can_view_company_v1(cp.id)
  order by (cp.owner_user_id = v_actor) desc nulls last,
    cp.updated_at desc nulls last, cp.created_at desc nulls last, cp.id
  limit 1;
end;
$function$;

revoke all on function public.company_save(text,text,text,text,text,text) from public, anon;
revoke all on function public.company_save(text,text,text,text,text,text,text) from public, anon;
revoke all on function public.company_get_active() from public, anon;
grant execute on function public.company_save(text,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.company_save(text,text,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.company_get_active() to authenticated, service_role;
