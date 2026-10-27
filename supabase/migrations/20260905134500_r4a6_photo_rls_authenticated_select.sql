begin;

-- These R5.5 relations already have owner/tenant SELECT policies, while all
-- writes are performed by the constrained RPCs. Grant only the table-level
-- privilege required for PostgreSQL to evaluate those policies.
revoke all on table
  public.estimate_revision_request_binding,
  public.estimate_revision_photo_upload,
  public.estimate_revision_photo_attachment,
  public.estimate_revision_photo_attachment_event
from public, anon;

grant select on table
  public.estimate_revision_request_binding,
  public.estimate_revision_photo_upload,
  public.estimate_revision_photo_attachment,
  public.estimate_revision_photo_attachment_event
to authenticated;

comment on table public.estimate_revision_photo_upload is
'R4-A6 staged photo reservation. Authenticated SELECT is filtered by owner/revision RLS; mutation remains RPC-only.';
comment on table public.estimate_revision_photo_attachment is
'R4-A6 immutable row-photo identity. Authenticated SELECT is filtered by parent revision RLS; mutation remains RPC-only.';
comment on table public.estimate_revision_photo_attachment_event is
'R4-A6 immutable row-photo event. Authenticated SELECT is filtered by parent revision RLS; mutation remains RPC-only.';

commit;
