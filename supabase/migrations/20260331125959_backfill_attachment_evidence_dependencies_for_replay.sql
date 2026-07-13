begin;

create table if not exists public.proposal_attachments (
  id bigint generated always as identity primary key,
  proposal_id uuid,
  bucket_id text,
  storage_path text,
  file_name text not null,
  group_key text not null,
  url text,
  created_at timestamptz default timezone('utc', now())
);

comment on table public.proposal_attachments is
'Compatibility empty proposal attachment table for local replayability when remote history placeholders did not recreate the original attachment table. Created only when absent.';

commit;
