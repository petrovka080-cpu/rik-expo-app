// Prospective PURE/mock regressions. These are not DB captures, file-pin admission or publication PASS.
import {assertMasterSingleDefinitionAppendSnapshotR1 as validate,
 assertMasterSingleDefinitionAppendUnchangedR1 as unchanged,
 readMasterSingleDefinitionAppendPreconditionsR1 as read,
 lockMasterSingleDefinitionAppendPreconditionsR1 as lock,
 type MasterSingleDefinitionAppendGuardInput as Input} from './masterSingleDefinitionAppendGuardsR1';
type Json=Record<string,any>;
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const groupId='TEST_ONLY:bounded-road-group',name='TEST_ONLY bounded road group';
const captureSha='a'.repeat(64); // PURE shape only; real ROAD factory MUST pin accepted074ece... capture bytes.
const scope=(n:number)=>({contract:'master-bounded-join-group-capture/r1',memberCount:n,maxMembers:32,captureSha256:captureSha} as const);
function fixture(n=1,optIn=true):{input:Input,snapshot:Json}{
 const members=Array.from({length:n},(_,i)=>({catalogId:'TEST_ONLY:member:'+i,ordinal:i,
  definitionVersionId:'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'),
  approvedTemplateBaselineId:'22222222-2222-4222-8222-'+String(i+1).padStart(12,'0'),
  definitionSha256:(i+1).toString(16).padStart(64,'0'),sourceIdentity:'TEST_ONLY:source:'+i,workKey:'TEST_ONLY:work:'+i,searchGroupId:groupId}));
 const input:Input={config:{stopCode:'BOUNDED_JOIN_TEST',catalogId:'TEST_ONLY:new-road',parentReleaseId:'TEST_ONLY:current-definition-release',
  parentSearchReleaseId:'TEST_ONLY:current-search-release',sourceId:'TEST_ONLY:new-source',catalogAppend:{requireUniqueWorkKey:true,
   capturedSourcePreimage:{sourceKey:'TEST_ONLY:new-source',expected:null},
   capturedJoinGroupMembers:{groupId,members,...(optIn?{captureScope:scope(n)}:{})},
   identity:{namespace:'global',domain:'transport',sourceIdentity:'TEST_ONLY:new-source-identity',workKey:'TEST_ONLY:new-work',titleRu:'TEST_ONLY road',denominatorEligible:true},
   searchPlacement:{groupMode:'join',groupId,groupNameRu:name,domainId:'transport',systemId:'transport',subsystemId:groupId,assemblyId:groupId,workFamilyId:groupId,
    breadcrumb:[name],groupOracleDisposition:{},membershipOrdinal:n,independentDisposition:{},elementType:'WORK',operationKind:'OTHER',technologyVariant:'TEST_ONLY',constructionState:'PARTIAL',
    normativeClassifiers:['TEST_ONLY'],applicabilityTags:['PARTIAL'],publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}}},
  successorReleaseId:'TEST_ONLY:successor-release',successorSearchReleaseId:'TEST_ONLY:successor-search',compositeSourceArtifactSha256:null};
 const live=members.map(m=>({...clone(m),searchReleaseId:input.config.parentSearchReleaseId,membershipGroupId:groupId,
  manifestReleaseId:input.config.parentReleaseId,actualDefinitionId:m.definitionVersionId,definitionCatalogId:m.catalogId,actualDefinitionSha256:m.definitionSha256,
  actualBaselineId:m.approvedTemplateBaselineId,baselineCatalogId:m.catalogId,baselineDefinitionVersionId:m.definitionVersionId,
  identityCatalogId:m.catalogId,identityRetiredAt:null,searchCatalogId:m.catalogId,searchDefinitionReleaseId:input.config.parentReleaseId,searchDefinitionVersionId:m.definitionVersionId}));
 return{input,snapshot:{parent:{id:input.config.parentReleaseId,status:'prepared',activated_at:null},
  parentSearch:{id:input.config.parentSearchReleaseId,status:'draft',activated_at:null,sealed_at:null},
  parentTargetCount:0,catalogDefinitionCount:0,identities:[],parentSearchTargetCount:0,ordinalCollisionCount:0,
  successorReleaseCount:0,successorSearchReleaseCount:0,source:null,
  group:{group_id:groupId,group_name_ru:name,domain_id:'transport',system_id:'transport',subsystem_id:groupId,assembly_id:groupId,work_family_id:groupId,breadcrumb:[name],member_count:n,member_set_sha256:'TEST_ONLY:cached-hash'},groupMembers:live}};
}
const mock=(f:ReturnType<typeof fixture>,rows:()=>Json[]=()=>clone(f.snapshot.groupMembers),isolation='read committed')=>({query:jest.fn().mockImplementation(async(sql:string,_values?:unknown[])=>{
 if(sql==='show transaction_isolation')return{rows:[{transaction_isolation:isolation}]};
 if(sql.includes('from public.estimate_search_group_membership x'))return{rows:rows()};
 if(sql.startsWith('select * from public.estimate_definition_release'))return{rows:[clone(f.snapshot.parent)]};
 if(sql.startsWith('select * from public.estimate_search_index_release'))return{rows:[clone(f.snapshot.parentSearch)]};
 if(sql.startsWith('select * from public.estimate_search_group'))return{rows:[clone(f.snapshot.group)]};
 if(sql.includes('count(*)::int value'))return{rows:[{value:0}]};return{rows:[]};
})});
const captured=(f:ReturnType<typeof fixture>)=>(f.input.config.catalogAppend as Json).capturedJoinGroupMembers;
const badScope:[string,(s:Json)=>void][]=[
 ['undefined',c=>{c.captureScope=undefined;}],['null',c=>{c.captureScope=null;}],['array',c=>{c.captureScope=[];}],
 ['extra key',c=>{c.captureScope.extra=true;}],['missing contract',c=>{delete c.captureScope.contract;}],
 ['wrong contract',c=>{c.captureScope.contract='other';}],['missing count',c=>{delete c.captureScope.memberCount;}],
 ['zero count',c=>{c.captureScope.memberCount=0;}],['negative count',c=>{c.captureScope.memberCount=-1;}],
 ['fraction count',c=>{c.captureScope.memberCount=1.1;}],['string count',c=>{c.captureScope.memberCount='1';}],
 ['unsafe count',c=>{c.captureScope.memberCount=Number.MAX_SAFE_INTEGER+1;}],['above32',c=>{c.captureScope.memberCount=33;}],
 ['declared count differs actual list',c=>{c.captureScope.memberCount=2;}],['missing max',c=>{delete c.captureScope.maxMembers;}],
 ['max31',c=>{c.captureScope.maxMembers=31;}],['max33',c=>{c.captureScope.maxMembers=33;}],['string max',c=>{c.captureScope.maxMembers='32';}],
 ['missing capture hash',c=>{delete c.captureScope.captureSha256;}],['null capture hash',c=>{c.captureScope.captureSha256=null;}],
 ['uppercase hash',c=>{c.captureScope.captureSha256='A'.repeat(64);}],['short hash',c=>{c.captureScope.captureSha256='a'.repeat(63);}],
 ['nonhex hash',c=>{c.captureScope.captureSha256='g'.repeat(64);}]
];
it.each([1,4,32])('accepts explicit bounded %i members without mutation, preserving same current anchors',n=>{
 const f=fixture(n),before=JSON.stringify(f);expect(()=>validate(f.input,f.snapshot)).not.toThrow();expect(()=>unchanged(f.input,f.snapshot,clone(f.snapshot))).not.toThrow();expect(JSON.stringify(f)).toBe(before);
});
it('omitting only captureScope preserves exact legacy four and does not mutate its config',()=>{
 const f=fixture(4,false),before=JSON.stringify(f);expect(()=>validate(f.input,f.snapshot)).not.toThrow();expect(JSON.stringify(f)).toBe(before);expect(captured(f)).not.toHaveProperty('captureScope');
});
it.each([1,32])('does not admit legacy %i-member capture when captureScope is omitted',n=>{
 const f=fixture(n,false);expect(()=>validate(f.input,f.snapshot)).toThrow('APPEND_CAPTURED_JOIN_GROUP_INVALID');
});
it.each(badScope)('rejects present malformed scope %s without any DB query or fallback',async(_name,mutate)=>{
 const f=fixture();mutate(captured(f));const client=mock(f);
 expect(()=>validate(f.input,f.snapshot)).toThrow('APPEND_CAPTURED_JOIN_GROUP_CAPTURE_SCOPE_INVALID');
 await expect(read(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_CAPTURE_SCOPE_INVALID');expect(client.query).not.toHaveBeenCalled();
});
it('rejects top-level extra captured keys despite valid scope',async()=>{
 const f=fixture();captured(f).arbitrary=true;const client=mock(f);await expect(read(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_INVALID');expect(client.query).not.toHaveBeenCalled();
});
it('refuses scope in create mode instead of creating or silently joining a group',async()=>{
 const f=fixture();(f.input.config.catalogAppend as Json).searchPlacement.groupMode='create';const client=mock(f);await expect(read(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_INVALID');expect(client.query).not.toHaveBeenCalled();
});
const changedLive:[string,(s:Json)=>void][]=[
 ['same-count different catalog',s=>{s.groupMembers[0].catalogId='TEST_ONLY:forged';}],
 ['missing current member',s=>{s.groupMembers=[];}],['unexpected extra member',s=>{s.groupMembers.push(clone(s.groupMembers[0]));}],
 ['changed ordinal',s=>{s.groupMembers[0].ordinal=1;}],['changed definition',s=>{s.groupMembers[0].definitionVersionId='33333333-3333-4333-8333-333333333333';}],
 ['changed baseline',s=>{s.groupMembers[0].approvedTemplateBaselineId='33333333-3333-4333-8333-333333333333';}],
 ['changed definition hash',s=>{s.groupMembers[0].actualDefinitionSha256='b'.repeat(64);}],
 ['missing current manifest leftjoin',s=>{s.groupMembers[0].manifestReleaseId=null;}],
 ['historical manifest release',s=>{s.groupMembers[0].manifestReleaseId='TEST_ONLY:old-release';}],
 ['missing actual definition leftjoin',s=>{s.groupMembers[0].actualDefinitionId=null;}],
 ['definition wrong catalog',s=>{s.groupMembers[0].definitionCatalogId='TEST_ONLY:other';}],
 ['missing actual baseline leftjoin',s=>{s.groupMembers[0].actualBaselineId=null;}],
 ['baseline wrong definition',s=>{s.groupMembers[0].baselineDefinitionVersionId='TEST_ONLY:other';}],
 ['baseline wrong catalog',s=>{s.groupMembers[0].baselineCatalogId='TEST_ONLY:other';}],
 ['source identity changed',s=>{s.groupMembers[0].sourceIdentity='TEST_ONLY:other';}],
 ['work key changed',s=>{s.groupMembers[0].workKey='TEST_ONLY:other';}],
 ['retired identity',s=>{s.groupMembers[0].identityRetiredAt='2026-10-19';}],
 ['missing identity leftjoin',s=>{s.groupMembers[0].identityCatalogId=null;}],
 ['missing search leftjoin',s=>{s.groupMembers[0].searchCatalogId=null;}],
 ['search wrong group',s=>{s.groupMembers[0].searchGroupId='TEST_ONLY:other';}],
 ['search stale definition release',s=>{s.groupMembers[0].searchDefinitionReleaseId='TEST_ONLY:old';}],
 ['search different definition',s=>{s.groupMembers[0].searchDefinitionVersionId='TEST_ONLY:other';}],
 ['membership different release',s=>{s.groupMembers[0].searchReleaseId='TEST_ONLY:other';}],
 ['cached count differs',s=>{s.group.member_count=2;}],['cached string count',s=>{s.group.member_count='1';}],
 ['wrong group classifier',s=>{s.group.domain_id='TEST_ONLY:other';}],['occupied proposed tail',s=>{s.ordinalCollisionCount=1;}]
];
it.each(changedLive)('rejects %s in both normal validation and locked reread comparison',(_name,mutate)=>{
 const f=fixture(),changed=clone(f.snapshot);mutate(changed);expect(()=>validate(f.input,changed)).toThrow('STOP_BOUNDED_JOIN_TEST_');expect(()=>unchanged(f.input,f.snapshot,changed)).toThrow('STOP_BOUNDED_JOIN_TEST_');
});
it.each(['catalogId','ordinal','definitionVersionId','approvedTemplateBaselineId'])('preserves duplicate rejection for %s even with bounded count2',key=>{
 const f=fixture(2);captured(f).members[1][key]=captured(f).members[0][key];expect(()=>validate(f.input,f.snapshot)).toThrow('APPEND_CAPTURED_JOIN_GROUP_DUPLICATE');
});
it('retains exact tail maxordinal+1 rather than accepting arbitrary gaps or requested ordinal',()=>{
 const f=fixture();(f.input.config.catalogAppend as Json).searchPlacement.membershipOrdinal=2;expect(()=>validate(f.input,f.snapshot)).toThrow('APPEND_CAPTURED_JOIN_GROUP_TAIL_ORDINAL');
});
it.each([1,32])('reads bounded %i+1 rows through unchanged fiveLEFTJOIN SQL without resource/history expansion',async n=>{
 const f=fixture(n),client=mock(f),s=await read(client,f.input);expect(s.groupMembers).toEqual(f.snapshot.groupMembers);
 const calls=client.query.mock.calls.filter(c=>String(c[0]).includes('from public.estimate_search_group_membership x'));expect(calls).toHaveLength(1);const sql=String(calls[0]![0]);
 expect(calls[0]![1]).toEqual([f.input.config.parentSearchReleaseId,groupId,f.input.config.parentReleaseId,n+1]);expect(sql.match(/left join/gu)).toHaveLength(5);expect(sql).toContain('limit $4::int');expect(sql).not.toContain('resource_graph');expect(sql).not.toContain('entry_sha256');
});
it.each([1,32])('rejects actual member%i+1 rather than treating capped subset as complete',async n=>{
 const f=fixture(n),client=mock(f,()=>[...clone(f.snapshot.groupMembers),clone(f.snapshot.groupMembers[0])]);await expect(read(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_READ_CAP');
});
it('keeps READCOMMITTED eleven-table SHARE ROW EXCLUSIVE locks and same normal/locked reader',async()=>{
 const f=fixture(),client=mock(f),before=await read(client,f.input);await lock(client,f.input);const after=await read(client,f.input);expect(()=>unchanged(f.input,before,after)).not.toThrow();
 const calls=client.query.mock.calls;expect(calls.filter(c=>c[0]==='show transaction_isolation')).toHaveLength(1);const table=calls.find(c=>String(c[0]).includes('in share row exclusive mode'))!;expect(String(table[0]).match(/public\.estimate_/gu)).toHaveLength(11);expect(String(table[0])).toContain('estimate_approved_template_baseline');
 expect(calls.filter(c=>String(c[0]).includes('from public.estimate_search_group_membership x'))).toHaveLength(2);expect(calls.every(c=>!/^\s*(?:insert|update|delete|begin|commit|rollback)\b/iu.test(String(c[0])))).toBe(true);
});
it.each(['repeatable read','serializable','read uncommitted'])('keeps locked reread isolation failclosed for %s',async isolation=>{
 const f=fixture(),client=mock(f,()=>clone(f.snapshot.groupMembers),isolation);await expect(lock(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_LOCKED_REREAD_REQUIRES_READ_COMMITTED');expect(client.query.mock.calls).toEqual([['show transaction_isolation']]);
});
it('rejects a phantom second member after valid preflight before DML',async()=>{
 const f=fixture();let rows=clone(f.snapshot.groupMembers);const client=mock(f,()=>rows);await read(client,f.input);await lock(client,f.input);rows.push(clone(rows[0]));await expect(read(client,f.input)).rejects.toThrow('APPEND_CAPTURED_JOIN_GROUP_READ_CAP');
});
it('retains exact preflight metadata comparison even with same one-member anchors',()=>{
 const f=fixture(),after=clone(f.snapshot);after.group.member_set_sha256='TEST_ONLY:changed';expect(()=>validate(f.input,after)).not.toThrow();expect(()=>unchanged(f.input,f.snapshot,after)).toThrow('APPEND_PREFLIGHT_CHANGED_BEFORE_WRITE');
});
it('retains captured absent-source guard; same artifact cannot introduce uncaptured existing source',()=>{
 const f=fixture(),changed=clone(f.snapshot);changed.source={source_key:f.input.config.sourceId,artifact_sha256:'b'.repeat(64)};expect(()=>validate(f.input,changed)).toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');expect(()=>unchanged(f.input,f.snapshot,changed)).toThrow('APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED');
});
it('omitted capturedJoinGroupMembers retains legacy queryset/isolation/ten-table locks unchanged',async()=>{
 const f=fixture(4,false);delete(f.input.config.catalogAppend as Json).capturedJoinGroupMembers;delete f.snapshot.groupMembers;const client=mock(f,()=>[]);const s=await read(client,f.input);expect(s).not.toHaveProperty('groupMembers');await lock(client,f.input);
 const calls=client.query.mock.calls;expect(calls.some(c=>c[0]==='show transaction_isolation')).toBe(false);expect(calls.some(c=>String(c[0]).includes('from public.estimate_search_group_membership x'))).toBe(false);const table=calls.find(c=>String(c[0]).includes('in share row exclusive mode'))!;expect(String(table[0]).match(/public\.estimate_/gu)).toHaveLength(10);expect(String(table[0])).not.toContain('estimate_approved_template_baseline');
});
