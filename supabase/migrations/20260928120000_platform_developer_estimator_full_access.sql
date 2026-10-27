-- Keep the protected platform-developer role catalog aligned with the client
-- contract. Ordinary company memberships and role resolution are unchanged.

begin;

alter table public.developer_access_overrides
  drop constraint if exists developer_access_overrides_allowed_roles_check;

alter table public.developer_access_overrides
  add constraint developer_access_overrides_allowed_roles_check check (
    allowed_roles <@ array[
      'foreman',
      'director',
      'buyer',
      'warehouse',
      'accountant',
      'contractor',
      'security',
      'engineer',
      'estimator'
    ]::text[]
  );

do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'developer_access_overrides'
      and column_name = 'entitlement'
  ) then
    execute $sql$
      update public.developer_access_overrides
      set
        allowed_roles = array[
          'foreman',
          'director',
          'buyer',
          'warehouse',
          'accountant',
          'contractor',
          'security',
          'engineer',
          'estimator'
        ]::text[],
        updated_at = now()
      where entitlement = 'platform_developer'
    $sql$;
  else
    -- Legacy staging predates the entitlement column. Its protected override
    -- row is selected by the complete server-authorized developer capability
    -- tuple, never by company membership, email, or an ordinary user role.
    update public.developer_access_overrides
    set
      allowed_roles = array[
        'foreman',
        'director',
        'buyer',
        'warehouse',
        'accountant',
        'contractor',
        'security',
        'engineer',
        'estimator'
      ]::text[],
      updated_at = now()
    where is_enabled = true
      and can_access_all_office_routes = true
      and can_impersonate_for_mutations = true
      and allowed_roles @> array[
        'foreman',
        'director',
        'buyer',
        'warehouse',
        'accountant',
        'contractor',
        'security',
        'engineer'
      ]::text[];
  end if;
end
$migration$;

commit;
