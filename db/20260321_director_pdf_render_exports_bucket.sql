begin;

insert into storage.buckets (id, name, public)
values ('director_pdf_exports', 'director_pdf_exports', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

commit;
