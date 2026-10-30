-- SOURCE ONLY, UNRUN. Root supplies reviewed disposable DB fixture JSON via
-- psql -v access_v4_fixture=...; no production setup/DDL/credentials in this file.
-- All test mutations, including real inner helper+triggers, share ONE rollback.
\set ON_ERROR_STOP on
begin;
select pg_catalog.set_config('gox.access_v4_fixture', :'access_v4_fixture', true);
set local role authenticated;
select pg_catalog.set_config('request.jwt.claims', (current_setting('gox.access_v4_fixture')::jsonb->'claims')::text, true);
do $tests$
declare
 f jsonb:=current_setting('gox.access_v4_fixture')::jsonb;
 a uuid:=(f->>'requestA')::uuid; b uuid:=(f->>'requestB')::uuid;
 ia uuid:=(f->>'itemA')::uuid; ib uuid:=(f->>'itemB')::uuid;
 before_heads jsonb; before_items jsonb; after_heads jsonb; after_items jsonb;
 attempt jsonb; invalid_cases jsonb; failed boolean; q numeric;
 first_result jsonb; second_result jsonb; submitted_result jsonb;
 created_id uuid; intent text:=f->>'intentId'; company uuid:=(f->>'companyId')::uuid;
 new_items jsonb:=f->'newItems'; item_count integer; qty_total numeric;
begin
 if current_database() is distinct from f->>'databaseName' or f->>'bindingReview' <> 'ROOT_REVIEWED_DISPOSABLE_DB' then
   raise exception 'STOP_UNVERIFIED_FIXTURE_BINDING';
 end if;
 if auth.uid() is distinct from (f->'claims'->>'sub')::uuid or a=b or ia=ib then raise exception 'fixture identity invalid'; end if;
 if not public.office_request_write_v2(a) or not public.office_request_write_v2(b) then
   raise exception 'Fixture MUST authorize this same actor to BOTH A and B';
 end if;
 if not exists(select 1 from public.request_items where id=ia and request_id=a)
   or not exists(select 1 from public.request_items where id=ib and request_id=b) then raise exception 'fixture parent invalid'; end if;
 if pg_catalog.to_regprocedure('public.request_item_update_qty(uuid,numeric)') is null then raise exception 'real inner quantity helper missing'; end if;
 if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.request_items'::regclass
   and tgname='aaa_office_request_child_v2' and tgenabled in ('O','A')) then raise exception 'real child trigger missing'; end if;
 select jsonb_agg(to_jsonb(r) order by r.id) into before_heads from public.requests r where id in(a,b);
 select jsonb_agg(to_jsonb(i) order by i.id) into before_items from public.request_items i where request_id in(a,b);
 invalid_cases:=jsonb_build_array(
   jsonb_build_object('name','other accessible parent item','items',jsonb_build_array(jsonb_build_object('request_item_id',ib,'qty',987)),'deletes',jsonb_build_array(ia)),
   jsonb_build_object('name','unknown item','items',jsonb_build_array(jsonb_build_object('request_item_id',f->>'unknownItem','qty',987)),'deletes','[]'::jsonb),
   jsonb_build_object('name','malformed item','items',jsonb_build_array(jsonb_build_object('request_item_id','bad-id','qty',987)),'deletes','[]'::jsonb),
   jsonb_build_object('name','foreign deletion','items','[]'::jsonb,'deletes',jsonb_build_array(ib)),
   jsonb_build_object('name','malformed deletion','items','[]'::jsonb,'deletes',jsonb_build_array('bad-id')),
   jsonb_build_object('name','duplicate item','items',jsonb_build_array(jsonb_build_object('request_item_id',ia,'qty',2),jsonb_build_object('request_item_id',ia,'qty',3)),'deletes','[]'::jsonb),
   jsonb_build_object('name','update/delete conflict','items',jsonb_build_array(jsonb_build_object('request_item_id',ia,'qty',2)),'deletes',jsonb_build_array(ia))
 );
 for attempt in select value from jsonb_array_elements(invalid_cases) loop
   failed:=false;
   begin
     perform public.request_sync_draft_v2(p_request_id=>a,p_comment=>'MUST ROLLBACK',p_items=>attempt->'items',
       p_pending_delete_ids=>array(select jsonb_array_elements_text(attempt->'deletes')));
   exception when sqlstate '22023' then
     if sqlerrm not like 'REQUEST_SYNC_ITEM_CONFLICT:%' then raise; end if;
     failed:=true;
   end;
   if not failed then raise exception 'Expected typed target conflict: %',attempt->>'name'; end if;
   select jsonb_agg(to_jsonb(r) order by r.id) into after_heads from public.requests r where id in(a,b);
   select jsonb_agg(to_jsonb(i) order by i.id) into after_items from public.request_items i where request_id in(a,b);
   if after_heads is distinct from before_heads or after_items is distinct from before_items then
     raise exception 'Whole transaction state changed after rejected %',attempt->>'name';
   end if;
 end loop;
 -- Positive executes the actual request_item_update_qty, not a stub or replica.
 select qty into q from public.request_items where id=ia;
 perform public.request_sync_draft_v2(p_request_id=>a,p_items=>jsonb_build_array(jsonb_build_object('request_item_id',ia,'qty',q+1)));
 if (select qty from public.request_items where id=ia) is distinct from q+1 then raise exception 'positive A qty failed'; end if;
 if (select jsonb_agg(to_jsonb(i) order by i.id) from public.request_items i where request_id=b)
   is distinct from (select jsonb_agg(value order by value->>'id') from jsonb_array_elements(before_items) where value->>'request_id'=b::text) then
   raise exception 'positive A changed B';
 end if;
 -- Deliberately discard first no-ID output as if acknowledgement were lost.
 -- The same transaction ledger and real children/numbering own replay.
 first_result:=public.request_sync_draft_v2(p_company_id=>company,p_creation_actor_id=>auth.uid(),
   p_creation_intent_id=>intent,p_foreman_name=>f->>'foremanName',p_items=>new_items);
 created_id:=(first_result->'request_payload'->>'id')::uuid;
 select count(*),sum(qty) into item_count,qty_total from public.request_items where request_id=created_id;
 second_result:=public.request_sync_draft_v2(p_company_id=>company,p_creation_actor_id=>auth.uid(),
   p_creation_intent_id=>intent,p_foreman_name=>f->>'foremanName',p_items=>new_items);
 if second_result->'request_payload'->>'id' is distinct from created_id::text or second_result->>'replayed' <> 'true'
   or (select count(*) from public.request_items where request_id=created_id) <> item_count
   or (select sum(qty) from public.request_items where request_id=created_id) is distinct from qty_total then raise exception 'no-ID replay duplicated effect'; end if;
 failed:=false;
 begin
   perform public.request_sync_draft_v2(p_company_id=>company,p_creation_actor_id=>auth.uid(),p_creation_intent_id=>intent,
     p_foreman_name=>f->>'foremanName',p_comment=>'different payload',p_items=>new_items);
 exception when insufficient_privilege then failed:=true;
 end;
 if not failed then raise exception 'Changed payload replay accepted'; end if;
 -- First effect includes submit. Lost-ack replay must return the same submitted
 -- receipt even though ordinary lifecycle mutation is now forbidden.
 submitted_result:=public.request_sync_draft_v2(p_company_id=>company,p_creation_actor_id=>auth.uid(),p_submit=>true,
   p_creation_intent_id=>intent||':submit',p_foreman_name=>f->>'foremanName',p_items=>new_items);
 if submitted_result->>'submitted' <> 'true' then raise exception 'submit positive failed'; end if;
 second_result:=public.request_sync_draft_v2(p_company_id=>company,p_creation_actor_id=>auth.uid(),p_submit=>true,
   p_creation_intent_id=>intent||':submit',p_foreman_name=>f->>'foremanName',p_items=>new_items);
 if second_result->'request_payload'->>'id' is distinct from submitted_result->'request_payload'->>'id'
   or second_result->>'replayed' <> 'true' then raise exception 'submit replay repeated transition'; end if;
end;
$tests$;
rollback;
