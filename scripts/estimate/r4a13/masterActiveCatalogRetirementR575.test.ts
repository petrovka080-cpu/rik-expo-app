import {resolveMasterActiveParentCountsR575 as counts,readMasterAreaRetirementCountsR575 as read,
 cloneMasterSingleDefinitionSearchReleaseR1 as cloneSearch,resolveMasterSingleDefinitionNextCounts as next} from './prepareMasterSingleDefinitionSuccessorR1';
import {CANONICAL_AREA_VARIANT_ID_PATTERN_V1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1';

describe('area identities are absent from the next active catalog, not just hidden',()=>{
 const parent={definitions:10473,parameters:96101,formulas:582111,resources:582544};
 const retired={definitions:4038,parameters:20000,formulas:200000,resources:200100};
 // Clone's declared production contract requires binding. This bounded SQL unit
 // supplies every field this helper consumes; it is never a publication config.
 const searchConfig=()=>({parentSearchReleaseId:'old-search',contract:'test-retirement',
  stopCode:'R575_TEST',masterSha256:'a'.repeat(64),catalogId:'canonical-work:base:physical_standard',
  binding:{rowId:'TEST_ONLY_SURVIVING_RESOURCE',applicability:{}},
  search:{aliases:['Работа'],canonicalNameRu:'Работа',extraSearchTermsRu:'Работа',
   primaryUom:'m2',shortScopeRu:'По измеренной площади',keyDistinguishingParameters:[],clarificationFields:[],
   includedBoundaries:[],excludedBoundaries:[],sourceProvenance:{}}} satisfies Parameters<typeof cloneSearch>[1]);

 it('subtracts actual retired definitions and row totals before replacing a surviving target',()=>{
  const active=counts(parent,retired);
  expect(next({parent:active,previousTarget:{parameters:20,formulas:26,resources:26},
   nextTarget:{parameters:55,formulas:48,resources:82}})).toEqual({definitions:6435,parameters:76136,formulas:382133,resources:382500});
  expect(parent).toEqual({definitions:10473,parameters:96101,formulas:582111,resources:582544});
 });
 it('keeps an already cleaned release unchanged',()=>{
  expect(counts(parent,{definitions:0,parameters:0,formulas:0,resources:0})).toEqual(parent);
 });
 it.each([-1,NaN,0.5,Number.MAX_SAFE_INTEGER+1,10474])('rejects invalid retired definition counts %s',definitions=>{
  expect(()=>counts(parent,{...retired,definitions})).toThrow('MASTER_ACTIVE_PARENT_RETIREMENT_');
 });
 it('does not admit underflow in any physical row total or an empty active catalog',()=>{
  expect(()=>counts(parent,{...retired,resources:parent.resources+1})).toThrow('MASTER_ACTIVE_PARENT_RETIREMENT_COUNTS');
  expect(()=>counts(parent,parent)).toThrow('MASTER_ACTIVE_PARENT_RETIREMENT_EMPTY');
 });
 it('reads one bounded aggregate with the actual inherited membership selection',async()=>{
  const query=jest.fn(async()=>({rows:[{...retired,snapshot:'a'.repeat(64)}]}));
  expect(await read({query} as never,'parent-release')).toEqual({...retired,snapshot:'a'.repeat(64)});
  expect(query).toHaveBeenCalledTimes(1);const call=(query.mock.calls[0] as unknown[]);
  expect(call[0]).toContain(CANONICAL_AREA_VARIANT_ID_PATTERN_V1);expect(call[0]).toContain('estimate_cumulative_manifest_entry');
  expect(call[1]).toEqual(['parent-release']);
 });
 it('clones surviving search entries and rebuilds groups before sealing the actual document count',async()=>{
  const calls:{sql:string;values:unknown[]}[]=[];
  const query=jest.fn(async(sql:string,values:unknown[])=>{
   calls.push({sql,values});return{rowCount:1,rows:sql.includes('select count(*)::int documents')
    ?[{documents:6426,visible:6426,snapshot_sha256:'b'.repeat(64)}]:[]};
  });
  const config=searchConfig();
  const result=await cloneSearch({query} as never,config,{releaseId:'new-def',searchReleaseId:'new-search',releaseKey:'key',
   head:'head',tree:'tree',fingerprint:'fingerprint',definitionId:'new-definition'});
  expect(result.documents).toBe(6426);
  const documents=calls.find(c=>c.sql.startsWith('insert into public.estimate_search_document'))!;
  expect(documents.sql).toContain(`source.catalog_id !~ '${CANONICAL_AREA_VARIANT_ID_PATTERN_V1}'`);
  expect(documents.sql).toContain('manifest.release_id=$2');
  const questions=calls.find(c=>c.sql.startsWith('insert into public.estimate_search_clarification_question'))!;
  expect(questions.sql).toContain('unnest(question.candidate_ids)');expect(questions.sql).toContain(CANONICAL_AREA_VARIANT_ID_PATTERN_V1);
  const membership=calls.findIndex(c=>c.sql.startsWith('insert into public.estimate_search_group_membership'));
  const rebuild=calls.findIndex(c=>c.sql.includes('update public.estimate_search_group g set'));
  expect(rebuild).toBeGreaterThan(membership);
  const seal=calls.find(c=>c.sql.startsWith('update public.estimate_search_index_release set snapshot_sha256'))!;
  expect(seal.sql).toContain('global_count=$4');expect(seal.values[3]).toBe(6426);
  expect(calls.filter(c=>c.sql.startsWith('delete ')).every(c=>c.sql.includes('g.search_release_id=$1')&&c.values[0]==='new-search')).toBe(true);
 });
 it('refuses a missing surviving target before sealing the cloned release',async()=>{
  const calls:{sql:string;values:unknown[]}[]=[];
  const query=jest.fn(async(sql:string,values:unknown[])=>{
   calls.push({sql,values});return{rowCount:sql.startsWith('update public.estimate_search_document set')?0:1,rows:[]};
  });
  await expect(cloneSearch({query} as never,searchConfig(),{
   releaseId:'new-def',searchReleaseId:'new-search',releaseKey:'key',head:'head',tree:'tree',
   fingerprint:'fingerprint',definitionId:'new-definition'})).rejects.toThrow('STOP_R575_TEST_SEARCH_TARGET_UPDATE');
  const update=calls.find(call=>call.sql.startsWith('update public.estimate_search_document set'));expect(update).toBeDefined();
  expect(update!.values[18]).toBe('canonical-work:base:physical_standard');
  expect(calls.some(call=>call.sql.startsWith('update public.estimate_search_index_release set snapshot_sha256'))).toBe(false);
  expect(calls.some(call=>call.sql.startsWith('select count(*)::int documents'))).toBe(false);
 });
});
