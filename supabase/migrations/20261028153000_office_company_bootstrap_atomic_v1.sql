-- One existing Office bootstrap operation: server-owned identity, one transaction,
-- replay of a completed company and recovery of a legacy partial company.
create or replace function public.office_company_bootstrap_v1(p_company jsonb, p_profile jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_company public.companies%rowtype;
  v_company_profile public.company_profiles%rowtype;
  v_owned_count integer;
  v_key text;
  v_name text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_company) is distinct from 'object'
     or jsonb_typeof(p_profile) is distinct from 'object' then
    raise exception 'Company and profile must be objects' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_company) loop
    if not v_key = any(array['name','city','address','industry','inn','phone_main',
      'phone_whatsapp','email','site','about_short','about_full']::text[])
      or jsonb_typeof(p_company -> v_key) not in ('string','null') then
      raise exception 'Unsupported company field' using errcode = '22023';
    end if;
  end loop;
  for v_key in select jsonb_object_keys(p_profile) loop
    if not v_key = any(array['full_name','phone','city','usage_market','bio',
      'telegram','whatsapp','position']::text[])
      or (v_key = 'usage_market' and jsonb_typeof(p_profile -> v_key) not in ('boolean','null'))
      or (v_key <> 'usage_market' and jsonb_typeof(p_profile -> v_key) not in ('string','null')) then
      raise exception 'Unsupported profile field' using errcode = '22023';
    end if;
  end loop;
  v_name := nullif(btrim(p_company ->> 'name'), '');
  if v_name is null then
    raise exception 'Company name is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text, 9151));
  select count(*) into v_owned_count from public.companies c where c.owner_user_id = v_actor;
  if v_owned_count > 1 then
    raise exception 'Multiple owned companies require explicit recovery review' using errcode = '21000';
  end if;
  select c.* into v_company from public.companies c
  where c.owner_user_id = v_actor for update;
  if found then
    if btrim(v_company.name) is distinct from v_name then
      raise exception 'Company already exists; refresh Office' using errcode = '23505';
    end if;
  else
    insert into public.companies(
      owner_user_id,name,city,address,industry,inn,phone_main,phone_whatsapp,
      email,site,about_short,about_full
    ) values (
      v_actor,v_name,p_company->>'city',p_company->>'address',p_company->>'industry',
      p_company->>'inn',p_company->>'phone_main',p_company->>'phone_whatsapp',
      p_company->>'email',p_company->>'site',p_company->>'about_short',p_company->>'about_full'
    ) returning * into v_company;
  end if;

  select cp.* into v_company_profile from public.company_profiles cp
  where cp.id = v_company.id for update;
  if found and (
    (v_company_profile.owner_user_id is not null and v_company_profile.owner_user_id <> v_actor)
    or (v_company_profile.user_id is not null and v_company_profile.user_id <> v_actor)
  ) then
    raise exception 'Existing company profile belongs to another subject' using errcode = '42501';
  end if;

  insert into public.company_members(company_id,user_id,role)
  values(v_company.id,v_actor,'director')
  on conflict(company_id,user_id) do update set role = 'director';

  insert into public.company_profiles as cp(id,owner_user_id,user_id,name,inn,legal_address,phone,email,site_address)
  values(v_company.id,v_actor,v_actor,v_company.name,v_company.inn,v_company.address,
    v_company.phone_main,v_company.email,v_company.about_full)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id, user_id = excluded.user_id
  where (cp.owner_user_id is null or cp.owner_user_id = v_actor)
    and (cp.user_id is null or cp.user_id = v_actor);
  if not found then
    raise exception 'Existing company profile belongs to another subject' using errcode = '42501';
  end if;

  insert into public.user_profiles(user_id,full_name,phone,city,usage_market,usage_build,bio,telegram,whatsapp,position)
  values(v_actor,p_profile->>'full_name',p_profile->>'phone',p_profile->>'city',
    coalesce((p_profile->>'usage_market')::boolean,true),true,p_profile->>'bio',
    p_profile->>'telegram',p_profile->>'whatsapp',p_profile->>'position')
  on conflict(user_id) do update set usage_build = true;

  return v_company.id;
end;
$function$;
revoke all on function public.office_company_bootstrap_v1(jsonb,jsonb) from public, anon;
grant execute on function public.office_company_bootstrap_v1(jsonb,jsonb) to authenticated, service_role;
