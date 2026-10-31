-- profiles.role is authoritative authorization data, not an editable profile field.
-- Keep trusted server provisioning and ordinary profile updates on the existing table.
create or replace function public.profiles_reject_client_role_write_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'Profile subject is not the authenticated user' using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
      raise exception 'Profile subject cannot be changed by the client' using errcode = '42501';
    end if;

    if (tg_op = 'INSERT' and new.role is distinct from 'guest')
       or (tg_op = 'UPDATE' and new.role is distinct from old.role) then
      raise exception 'Profile role must be assigned by a trusted server operation' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.profiles_reject_client_role_write_v1() from public, anon, authenticated;

drop trigger if exists profiles_authoritative_role_write_guard_v1 on public.profiles;
create trigger profiles_authoritative_role_write_guard_v1
before insert or update on public.profiles
for each row execute function public.profiles_reject_client_role_write_v1();
