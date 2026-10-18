import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertMasterSingleDefinitionAppendSnapshotR1 as validate,
 assertMasterSingleDefinitionAppendUnchangedR1 as unchanged,readMasterSingleDefinitionAppendPreconditionsR1 as read,
 lockMasterSingleDefinitionAppendPreconditionsR1 as lock,type MasterSingleDefinitionAppendGuardInput as Input} from './masterSingleDefinitionAppendGuardsR1';
type Json=Record<string,any>;
const actualPath=resolve(__dirname,'../../../data/estimate-benchmarks/fixtures/paving-cut70-group4-members-capture-r1.json');
const bytes=readFileSync(actualPath),actual=JSON.parse(bytes.toString('utf8'));
const raw=actual.sets.exactCurrentFourSidewalkMemberHeaders.rawRows as string[];
const headers=raw.map(s=>JSON.parse(s) as Json);
const members=headers.map(h=>({catalogId:h.catalog_id,ordinal:h.ordinal,definitionVersionId:h.definition_version_id,
 approvedTemplateBaselineId:h.approved_template_baseline_id,definitionSha256:h.definition_sha256,
 sourceIdentity:h.source_identity,workKey:h.work_key,searchGroupId:h.search_group_id}));
const groupId='wg:expanded:sidewalks',name='Дороги, транспорт и площадки: устройство тротуаров';
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
// This is a PURE reader mock rebound to ROOT's actual ELECOR pair, not a claimed DB capture at that pair.
const input=():Input=>({config:{stopCode:'CUT70_GROUP4',catalogId:'canonical-work:master:paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04',
 parentReleaseId:'d3bc6c1a-e16d-5fcc-b36c-cc584a31c529',parentSearchReleaseId:'c97fa9c9-338e-5c6a-8ce5-216deaa73176',
 sourceId:'kg_krer27_07_005_04_paving_cut_stationary_70mm_r1',catalogAppend:{requireUniqueWorkKey:true,
  capturedJoinGroupMembers:{groupId,members:clone(members)},
  identity:{namespace:'global',domain:'transport',sourceIdentity:'kg:krer27:27-07-005-04:stationary:70mm:actual-cut-m',
   workKey:'paving_tile_stationary_cut_70mm_actual_linear_m_krer27_07_005_04',titleRu:'Резка тротуарной плитки70мм',denominatorEligible:true},
  searchPlacement:{groupMode:'join',groupId,groupNameRu:name,domainId:'transport',systemId:'transport',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
   breadcrumb:[name],groupOracleDisposition:{},membershipOrdinal:4,independentDisposition:{},elementType:'WORK',operationKind:'OTHER',technologyVariant:'STATIONARY_70MM',constructionState:'PARTIAL',
   normativeClassifiers:['27-07-005-04'],applicabilityTags:['PARTIAL'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}}},
 successorReleaseId:'TEST_ONLY_SUCCESSOR_DEFINITION_RELEASE',successorSearchReleaseId:'TEST_ONLY_SUCCESSOR_SEARCH_RELEASE',compositeSourceArtifactSha256:null});
const live=(i:Input=input())=>members.map(m=>({...clone(m),searchReleaseId:i.config.parentSearchReleaseId,membershipGroupId:groupId,
 manifestReleaseId:i.config.parentReleaseId,actualDefinitionId:m.definitionVersionId,definitionCatalogId:m.catalogId,actualDefinitionSha256:m.definitionSha256,
 actualBaselineId:m.approvedTemplateBaselineId,baselineCatalogId:m.catalogId,baselineDefinitionVersionId:m.definitionVersionId,
 identityCatalogId:m.catalogId,identityRetiredAt:null,searchCatalogId:m.catalogId,searchDefinitionReleaseId:i.config.parentReleaseId,searchDefinitionVersionId:m.definitionVersionId}));
const snapshot=(i:Input=input()):Json=>({parent:{id:i.config.parentReleaseId,status:'prepared',activated_at:null},
 parentSearch:{id:i.config.parentSearchReleaseId,status:'draft',activated_at:null,sealed_at:null},
 parentTargetCount:0,catalogDefinitionCount:0,identities:[],parentSearchTargetCount:0,
 group:{group_id:groupId,group_name_ru:name,domain_id:'transport',system_id:'transport',subsystem_id:groupId,assembly_id:groupId,work_family_id:groupId,breadcrumb:[name],member_count:4,member_set_sha256:'TEST_ONLY_CACHED_GROUP_HASH'},
 ordinalCollisionCount:0,successorReleaseCount:0,successorSearchReleaseCount:0,source:null,groupMembers:live(i)});
const mock=(getMembers:()=>Json[]=()=>live(),isolation='read committed')=>({query:jest.fn().mockImplementation(async(sql:string,_values?:unknown[])=>{
 if(sql==='show transaction_isolation')return {rows:[{transaction_isolation:isolation}]};
 if(sql.includes('from public.estimate_search_group_membership x'))return {rows:getMembers()};
 if(sql.startsWith('select * from public.estimate_definition_release'))return {rows:[snapshot().parent]};
 if(sql.startsWith('select * from public.estimate_search_index_release'))return {rows:[snapshot().parentSearch]};
 if(sql.startsWith('select * from public.estimate_search_group'))return {rows:[snapshot().group]};
 if(sql.includes('count(*)::int value'))return {rows:[{value:0}]};
 return {rows:[]};
})});
const legacy=()=>{const i=input();delete(i.config.catalogAppend as Json).capturedJoinGroupMembers;return i;};

it('pins the actual b0c four-member capture and accepts current contextual releases without rewriting history',()=>{
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('b0c8f37eda9a1f40662e3b5afc98b107cd6e32eaf1f680ab53d83c9c2e1babeb');
 expect(actual.completeReadSet).toBe(true);expect(actual.transactionRolledBack).toBe(true);expect(actual.connectionClosed).toBe(true);
 expect(actual.sets.exactCurrentFourSidewalkMemberHeaders.rowCount).toBe(4);expect(members.map(m=>m.ordinal)).toEqual([0,1,2,3]);
 expect(members[0]!.catalogId).toBe('canonical-work:expanded:sidewalks');
 const i=input(),s=snapshot(i),before=JSON.stringify({i,s});expect(()=>validate(i,s)).not.toThrow();expect(()=>unchanged(i,s,clone(s))).not.toThrow();
 expect(JSON.stringify({i,s})).toBe(before);expect(headers[0]!.definition_release_id).toBe('60f8d40d-3c34-5ab6-850b-3a332c9f56b8');
 for(const member of i.config.catalogAppend!.capturedJoinGroupMembers!.members){expect(member).not.toHaveProperty('releaseId');expect(member).not.toHaveProperty('entrySha256');}
});
it('allows a differently ordered captured list without mutating it',()=>{
 const i=input();(i.config.catalogAppend as Json).capturedJoinGroupMembers.members.reverse();const before=JSON.stringify(i);
 expect(()=>validate(i,snapshot())).not.toThrow();expect(JSON.stringify(i)).toBe(before);
});
const changedActual:[string,(s:Json)=>void][]=[
 ['same count changed catalog',s=>{s.groupMembers[0].catalogId='OTHER_ACTUAL_CATALOG';}],
 ['missing member',s=>{s.groupMembers.pop();}],
 ['unexpected fifth',s=>{s.groupMembers.push(clone(s.groupMembers[0]));}],
 ['repointed manifest definition',s=>{s.groupMembers[0].definitionVersionId=members[1]!.definitionVersionId;}],
 ['repointed baseline',s=>{s.groupMembers[0].approvedTemplateBaselineId=members[1]!.approvedTemplateBaselineId;}],
 ['changed manifest hash',s=>{s.groupMembers[0].definitionSha256='a'.repeat(64);}],
 ['changed live definition hash',s=>{s.groupMembers[0].actualDefinitionSha256='a'.repeat(64);}],
 ['changed ordinal',s=>{s.groupMembers[0].ordinal=3;}],
 ['changed identity source',s=>{s.groupMembers[0].sourceIdentity='forged:source';}],
 ['changed work key',s=>{s.groupMembers[0].workKey='forged_key';}],
 ['changed search group',s=>{s.groupMembers[0].searchGroupId='wg:other';}],
 ['stale contextual manifest release',s=>{s.groupMembers[0].manifestReleaseId=headers[0]!.definition_release_id;}],
 ['stale search definition release',s=>{s.groupMembers[0].searchDefinitionReleaseId=headers[0]!.definition_release_id;}],
 ['different current search release',s=>{s.groupMembers[0].searchReleaseId='OTHER_SEARCH';}],
 ['missing manifest left join',s=>{s.groupMembers[0].manifestReleaseId=null;s.groupMembers[0].definitionVersionId=null;s.groupMembers[0].approvedTemplateBaselineId=null;}],
 ['missing definition left join',s=>{s.groupMembers[0].actualDefinitionId=null;}],
 ['definition belongs another catalog',s=>{s.groupMembers[0].definitionCatalogId='other';}],
 ['missing baseline left join',s=>{s.groupMembers[0].actualBaselineId=null;}],
 ['baseline belongs another definition',s=>{s.groupMembers[0].baselineDefinitionVersionId=members[1]!.definitionVersionId;}],
 ['baseline belongs another catalog',s=>{s.groupMembers[0].baselineCatalogId='other';}],
 ['missing current search document',s=>{s.groupMembers[0].searchCatalogId=null;}],
 ['search document points another definition',s=>{s.groupMembers[0].searchDefinitionVersionId=members[1]!.definitionVersionId;}],
 ['missing identity left join',s=>{s.groupMembers[0].identityCatalogId=null;}],
 ['retired member identity',s=>{s.groupMembers[0].identityRetiredAt='2026-10-18T00:00:00Z';}],
 ['cached group count disagrees',s=>{s.group.member_count=3;}],
 ['ordinal4 occupied',s=>{s.ordinalCollisionCount=1;}],
];
it.each(changedActual)('rejects actual %s at initial or locked snapshot',(_label,mutate)=>{
 const s=snapshot();mutate(s);expect(()=>validate(input(),s)).toThrow('STOP_CUT70_GROUP4_');
 expect(()=>unchanged(input(),snapshot(),s)).toThrow('STOP_CUT70_GROUP4_');
});
const malformed:[string,(i:Json)=>void][]=[
 ['explicit undefined',i=>{i.config.catalogAppend.capturedJoinGroupMembers=undefined;}],
 ['null',i=>{i.config.catalogAppend.capturedJoinGroupMembers=null;}],
 ['array',i=>{i.config.catalogAppend.capturedJoinGroupMembers=[];}],
 ['wrong captured group',i=>{i.config.catalogAppend.capturedJoinGroupMembers.groupId='wg:other';}],
 ['not join mode',i=>{i.config.catalogAppend.searchPlacement.groupMode='create';}],
 ['missing captured member',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members.pop();}],
 ['extra captured member',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members.push(clone(members[0]));}],
 ['duplicate catalog',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[1].catalogId=members[0]!.catalogId;}],
 ['duplicate ordinal',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[1].ordinal=0;}],
 ['duplicate definition',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[1].definitionVersionId=members[0]!.definitionVersionId;}],
 ['duplicate baseline',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[1].approvedTemplateBaselineId=members[0]!.approvedTemplateBaselineId;}],
 ['noninteger ordinal',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].ordinal=0.5;}],
 ['invalid definition UUID',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].definitionVersionId='not-uuid';}],
 ['invalid baseline UUID',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].approvedTemplateBaselineId='not-uuid';}],
 ['invalid hash',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].definitionSha256='invalid';}],
 ['empty source identity',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].sourceIdentity='';}],
 ['empty work key',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].workKey='';}],
 ['wrong captured search group',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].searchGroupId='wg:other';}],
 ['historical release incorrectly claimed immutable',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].releaseId=headers[0]!.definition_release_id;}],
 ['historical entry hash incorrectly claimed immutable',i=>{i.config.catalogAppend.capturedJoinGroupMembers.members[0].entrySha256=headers[0]!.entry_sha256;}],
 ['wrong tail ordinal',i=>{i.config.catalogAppend.searchPlacement.membershipOrdinal=3;}],
];
it.each(malformed)('rejects malformed capture %s before member read',async(_label,mutate)=>{
 const i=clone(input()) as unknown as Json;mutate(i);const client=mock();
 expect(()=>validate(i as unknown as Input,snapshot())).toThrow('STOP_CUT70_GROUP4_');
 await expect(read(client,i as unknown as Input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_');expect(client.query).not.toHaveBeenCalled();
});
it('rejects a forged but structurally valid captured list against actual four anchors even when live count stays4',()=>{
 const i=input();(i.config.catalogAppend as Json).capturedJoinGroupMembers.members[0].catalogId='canonical-work:FORGED';
 expect(()=>validate(i,snapshot())).toThrow('APPEND_CAPTURED_JOIN_GROUP_MEMBERS_CHANGED');
 expect(()=>unchanged(i,snapshot(),snapshot())).toThrow('APPEND_CAPTURED_JOIN_GROUP_MEMBERS_CHANGED');
});
it('bounds the actual reader by n+1 and preserves every missing anchor via LEFT JOINs',async()=>{
 const client=mock(),i=input();const s=await read(client,i);expect(s.groupMembers).toEqual(live());
 const calls=client.query.mock.calls.filter(c=>String(c[0]).includes('from public.estimate_search_group_membership x'));
 expect(calls).toHaveLength(1);expect(calls[0]![1]).toEqual([i.config.parentSearchReleaseId,groupId,i.config.parentReleaseId,5]);
 const sql=String(calls[0]![0]);expect(sql.match(/left join/gu)).toHaveLength(5);expect(sql).toContain('limit $4::int');
 expect(sql).not.toContain('entry_sha256');expect(sql).not.toContain('resource_graph');expect(sql).not.toContain('passport');
 expect(sql.slice(sql.indexOf('where x.search_release_id'))).not.toMatch(/(?:and|where)\s+[mdbis]\./u);
});
it('reader rejects a fifth member at cap without pretending a four-row subset is complete',async()=>{
 const client=mock(()=>[...live(),clone(live()[0]!)]);await expect(read(client,input())).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_READ_CAP');
});
it('locks the same actual group and approved-baseline table under READ COMMITTED, then rereads through the same reader',async()=>{
 let rows=live();const client=mock(()=>rows),i=input();const before=await read(client,i);await lock(client,i);const after=await read(client,i);
 expect(()=>unchanged(i,before,after)).not.toThrow();
 const calls=client.query.mock.calls;expect(calls.filter(c=>c[0]==='show transaction_isolation')).toHaveLength(1);
 const table=calls.find(c=>String(c[0]).includes('in share row exclusive mode'))!;expect(String(table[0])).toContain('public.estimate_approved_template_baseline');
 expect(String(table[0]).match(/public\.estimate_/gu)).toHaveLength(11);
 expect(calls.filter(c=>String(c[0]).includes('from public.estimate_search_group_membership x'))).toHaveLength(2);
 expect(calls.every(c=>!/^\s*(?:insert|update|delete|begin|commit|rollback)\b/iu.test(String(c[0])))).toBe(true);
 rows=live();rows[0]!.workKey='changed_after_preflight';await expect(read(client,i)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_MEMBERS_CHANGED');
});
it.each(['repeatable read','serializable','read uncommitted'])('refuses stale locked-reread isolation %s before locks',async isolation=>{
 const client=mock(()=>live(),isolation);await expect(lock(client,input())).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_LOCKED_REREAD_REQUIRES_READ_COMMITTED');
 expect(client.query.mock.calls).toEqual([['show transaction_isolation']]);
});
it('rejects any preflight-vs-underlock snapshot drift even with the exact4 anchors intact',()=>{
 const before=snapshot(),after=clone(before);after.group.member_set_sha256='CHANGED_CACHED_METADATA';
 expect(()=>validate(input(),after)).not.toThrow();expect(()=>unchanged(input(),before,after)).toThrow('APPEND_PREFLIGHT_CHANGED_BEFORE_WRITE');
});
it('omitted opt-in keeps legacy join snapshot, query set and ten-table locking behavior unchanged',async()=>{
 const i=legacy(),s=snapshot(i);delete s.groupMembers;expect(()=>validate(i,s)).not.toThrow();
 const client=mock();const result=await read(client,i);expect(result).not.toHaveProperty('groupMembers');await lock(client,i);
 const calls=client.query.mock.calls;expect(calls.some(c=>String(c[0]).includes('from public.estimate_search_group_membership x'))).toBe(false);
 expect(calls.some(c=>c[0]==='show transaction_isolation')).toBe(false);
 const table=calls.find(c=>String(c[0]).includes('in share row exclusive mode'))!;expect(String(table[0])).not.toContain('estimate_approved_template_baseline');
 expect(String(table[0]).match(/public\.estimate_/gu)).toHaveLength(10);
});
