-- Restore the existing developer break-glass override for internal verification.
-- This does not create business data or weaken normal RBAC: only this known
-- developer account gets the already-defined full-office override window.

insert into public.developer_access_overrides (
  user_id,
  is_enabled,
  allowed_roles,
  active_effective_role,
  can_access_all_office_routes,
  can_impersonate_for_mutations,
  expires_at,
  reason,
  created_by
)
select
  u.id,
  true,
  array[
    'buyer',
    'director',
    'warehouse',
    'accountant',
    'foreman',
    'contractor',
    'security',
    'engineer'
  ]::text[],
  'director',
  true,
  false,
  now() + interval '180 days',
  'Developer full-office access restored for pre-release web/iOS/Android verification',
  null::uuid
from auth.users u
where u.id = '9adc5ab1-31fa-41be-8a00-17eadbb37c39'::uuid
   or lower(u.email) = lower('petrovka080@gmail.com')
order by case when u.id = '9adc5ab1-31fa-41be-8a00-17eadbb37c39'::uuid then 0 else 1 end
limit 1
on conflict (user_id) do update
set
  is_enabled = excluded.is_enabled,
  allowed_roles = excluded.allowed_roles,
  active_effective_role = excluded.active_effective_role,
  can_access_all_office_routes = excluded.can_access_all_office_routes,
  can_impersonate_for_mutations = excluded.can_impersonate_for_mutations,
  expires_at = excluded.expires_at,
  reason = excluded.reason;
