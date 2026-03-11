begin;

alter table public.proposal_attachments enable row level security;

grant select on table public.proposal_attachments to authenticated;
grant select on table storage.objects to authenticated;

drop policy if exists director_read_proposal_attachments on public.proposal_attachments;
create policy director_read_proposal_attachments
on public.proposal_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.role = 'director'
  )
  and exists (
    select 1
    from public.proposals p
    where p.id = proposal_attachments.proposal_id
  )
);

drop policy if exists director_read_proposal_files on storage.objects;
create policy director_read_proposal_files
on storage.objects
for select
to authenticated
using (
  bucket_id = 'proposal_files'
  and exists (
    select 1
    from public.profiles pr
    where pr.user_id = auth.uid()
      and pr.role = 'director'
  )
);

commit;
