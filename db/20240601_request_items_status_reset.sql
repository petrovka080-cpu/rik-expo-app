-- db/20240601_request_items_status_reset.sql
-- Сбрасываем залипшие статусы позиций и черновиков и выставляем дефолты

begin;

alter table if exists public.requests
  alter column status set default 'draft';

alter table if exists public.request_items
  alter column status set default 'Черновик';

update public.request_items ri
   set status = 'Черновик'
  from public.requests r
 where r.id = ri.request_id
   and lower(coalesce(r.status, '')) in ('draft', 'черновик')
   and (
     ri.status is null or
     lower(ri.status) not in ('утверждено', 'отклонено', 'approved', 'rejected')
   );

commit;
