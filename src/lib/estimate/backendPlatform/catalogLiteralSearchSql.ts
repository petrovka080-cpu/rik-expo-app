/** The canonical backend SQL used by all local Web/Android catalog searches.
 * Relaxed descriptions rank complete term coverage before an incidental name prefix.
 * Literal PHRASE/ANY/ALL ordering and canonical identity resolution are preserved.
 */
export const CANONICAL_CATALOG_RANKING_ALGORITHM = 'relaxed-coverage-s2748-v1';

export const CANONICAL_CATALOG_LITERAL_SEARCH_SQL = `
with tokens as materialized(
  select distinct unnest($2::text[]) q
), token_state as(
  select count(*)::int token_count from tokens
), source_hits as materialized(
  select source.catalog_id source_catalog_id,
    coalesce(source.canonical_target_catalog_id,source.catalog_id) resolved_catalog_id,
    count(distinct token.q)::int matched_count,
    bool_or(source.normalized_catalog_id=token.q or source.normalized_canonical_name=token.q) exact_name,
    bool_or(token.q=any(source.normalized_aliases)) exact_alias,
    bool_or(source.normalized_canonical_name like token.q||'%') prefix_name,
    bool_or(position(token.q in source.normalized_canonical_name)>0) literal_name,
    bool_or(position(token.q in source.normalized_search_blob)>0
      and position(token.q in source.normalized_canonical_name)=0) literal_alias,
    string_agg(distinct token.q,' | ' order by token.q) matched_term
  from public.estimate_search_document source
  cross join tokens token
  where source.search_release_id=$1
    and case upper($8)
      when 'REFERENCES' then source.adjudication_class='EXTERNAL_REFERENCE'
      else source.adjudication_class='EFFECTIVE_WORK' and source.selectable
        or source.adjudication_class in('ALIAS','DUPLICATE') and exists(
          select 1 from public.estimate_search_document target
          where target.search_release_id=source.search_release_id
            and target.catalog_id=source.canonical_target_catalog_id
            and target.adjudication_class='EFFECTIVE_WORK' and target.selectable)
    end
    and position(token.q in source.normalized_search_blob)>0
  group by source.catalog_id,source.canonical_target_catalog_id
), accepted as materialized(
  select hit.*,
    case when hit.exact_name then 1 when hit.exact_alias then 2 when hit.prefix_name then 3
      when hit.literal_alias and not hit.literal_name then 4 else 5 end tier
  from source_hits hit cross join token_state state
  where (upper($3)='ANY' and hit.matched_count>0)
    or (upper($3)='ALL' and state.token_count>0 and hit.matched_count=state.token_count)
    or (upper($3)='RELAXED' and state.token_count>0
      and hit.matched_count>=greatest(2,ceil(state.token_count*0.3)::int))
    or (upper($3)='PHRASE' and state.token_count=1 and hit.matched_count=1)
), filtered as materialized(
  select hit.*,target.catalog_origin,target.group_id,target.domain_id,target.system_id,target.work_family_id,
    row_number() over(partition by hit.resolved_catalog_id order by
      case when upper($3)='RELAXED' then hit.matched_count else 0 end desc,hit.tier,
      hit.matched_count desc,hit.source_catalog_id=hit.resolved_catalog_id desc,hit.source_catalog_id) resolved_ordinal
  from accepted hit
  join public.estimate_search_document target
    on target.search_release_id=$1 and target.catalog_id=hit.resolved_catalog_id
  where (coalesce($4,'')='' or target.domain_id=$4)
    and (coalesce($5,'')='' or target.group_id=$5)
    and (coalesce($6,'')='' or target.operation_kind=$6)
), deduplicated as materialized(
  select filtered.*,
    concat_ws(E'\\u001f',
      case when upper($3)='RELAXED' then lpad((9999-filtered.matched_count)::text,4,'0') end,
      lpad(filtered.tier::text,2,'0'),
      lpad((9999-filtered.matched_count)::text,4,'0'),filtered.domain_id,
      filtered.system_id,filtered.work_family_id,filtered.resolved_catalog_id) stable_order_key
  from filtered where resolved_ordinal=1
), summary as materialized(
  select count(*)::bigint literal_total_count,
    count(*) filter(where catalog_origin='GLOBAL')::bigint global_literal_total_count,
    count(*) filter(where catalog_origin<>'GLOBAL')::bigint external_literal_total_count,
    count(distinct group_id)::bigint group_total_count,
    encode(extensions.digest(convert_to(coalesce(string_agg(
      resolved_catalog_id||E'\\u001f'||tier::text||E'\\u001f'||stable_order_key,
      E'\\n' order by stable_order_key),''),'UTF8'),'sha256'),'hex') result_set_sha256
  from deduplicated
), page as(
  select hit.*,summary.* from deduplicated hit cross join summary
  where $7::text is null or hit.stable_order_key>$7
  order by hit.stable_order_key limit $9
)
select document.*,group_row.group_name_ru,page.source_catalog_id,page.tier,page.matched_term,
  page.stable_order_key,page.literal_total_count,page.global_literal_total_count,
  page.external_literal_total_count,page.group_total_count,page.result_set_sha256
from page
join public.estimate_search_document document
  on document.search_release_id=$1 and document.catalog_id=page.resolved_catalog_id
join public.estimate_search_group group_row
  on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
order by page.stable_order_key`;
