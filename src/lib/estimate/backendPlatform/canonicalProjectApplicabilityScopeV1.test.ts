import {resolveCanonicalScopeRequirementV1} from './canonicalScopeRequirementV1';
const newPlan='Согласованный предстоящий пирог',oldStates=['Верхнее основание уже принято и огрунтовано','Верхнее основание уже принято; грунтование предстоит','Прежний прогноз стяжки без нижних слоёв'];
const graph={costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:'lower-chain',groupTitleRu:'Проектная применимость нижних слоёв',titleRu:'Согласованная будущая конструкция',reasonRu:'Проектная применимость не подтверждает фактическое выполнение.',objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:'condition',unknownObjectValues:oldStates,exactScopeWhen:{kind:'equals',parameterId:'condition',value:newPlan},coveringRowIds:[],originalRowIds:[],sourceEvidence:[{sha256:'1'.repeat(64),locator:'Source control'}]}};
function resolve(value:unknown,g:Record<string,unknown>=graph){return resolveCanonicalScopeRequirementV1({graph:g,rowId:'chain',parameters:{condition:value},parameterIds:new Set(['condition']),resourceIds:new Set(['chain']),knownQuantityRowIds:new Set()});}
test.each([...oldStates,null])('new planned layers require the coherent project state, not already accepted upper conditions: %s',value=>{
 expect(resolve(value)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['condition']});
});
test('the opt-in project check confirms applicability only and does not invent a legacy classification',()=>{
 expect(resolve(newPlan)).toMatchObject({status:'COMPLETED',separatePaymentAccepted:false,numericNormAccepted:false});
 expect(resolve('Нужен другой расчёт')).toMatchObject({status:'SCOPE_UNVERIFIED'});
});
test('historical OBJECT_SCOPE still requires and preserves an explicit legacy value',()=>{
 const old=structuredClone(graph) as any;delete old.scopeRequirementV1.objectFactMode;
 expect(()=>resolve(newPlan,old)).toThrow('scope requirement identity invalid');
 old.scopeRequirementV1.legacyObjectValue='Реальный прежний состав';expect(resolve('Реальный прежний состав',old)).toMatchObject({status:'LEGACY_SOURCE_REQUIRED'});
});
test.each(['contradictoryLegacy','unknownMode'])('rejects a contradictory project-only contract: %s',kind=>{
 const bad=structuredClone(graph) as any;if(kind==='contradictoryLegacy')bad.scopeRequirementV1.legacyObjectValue=oldStates[0];else bad.scopeRequirementV1.objectFactMode='IGNORE_VALIDATION';
 expect(()=>resolve(newPlan,bad)).toThrow('scope requirement identity invalid');
});
test('an unused or wholly excluded planned operation does not reopen the upper-base project state',()=>{
 const g=structuredClone(graph) as any;g.scopeRequirementV1.projectOperationContextsV1=[{when:{kind:'equals',parameterId:'lower',value:'planned'},resourceRowIds:['lower-material']}];
 const input={graph:g,rowId:'chain',parameters:{condition:oldStates[0],lower:'planned'},parameterIds:new Set(['condition','lower']),resourceIds:new Set(['chain','lower-material']),knownQuantityRowIds:new Set<string>(),excludedOperationResourceRowIds:new Set<string>()};
 expect(resolveCanonicalScopeRequirementV1(input)).toMatchObject({status:'OBJECT_FACT_REQUIRED'});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,lower:'none'}})).toMatchObject({status:'NOT_APPLICABLE'});
 expect(resolveCanonicalScopeRequirementV1({...input,excludedOperationResourceRowIds:new Set(['lower-material'])})).toMatchObject({status:'NOT_APPLICABLE'});
 const old=structuredClone(g);delete old.scopeRequirementV1.objectFactMode;old.scopeRequirementV1.legacyObjectValue='legacy';expect(()=>resolveCanonicalScopeRequirementV1({...input,graph:old})).toThrow('scope requirement identity invalid');
});
test('conditional project applicability identifies its unknown fact and ignores only the excluded operation',()=>{
 const g=structuredClone(graph) as any;g.scopeRequirementV1.projectOperationContextsV1=[{when:{kind:'equals',parameterId:'lower',value:'planned'},resourceRowIds:['lower-material'],
   applicabilityWhen:{kind:'equals',parameterId:'base',value:'supported'},requiredFactParameterIds:['base'],unknownFactValues:{base:['unknown']}}];
 const input={graph:g,rowId:'chain',parameters:{condition:newPlan,lower:'planned',base:'unknown'},parameterIds:new Set(['condition','lower','base']),resourceIds:new Set(['chain','lower-material']),knownQuantityRowIds:new Set<string>()};
 expect(resolveCanonicalScopeRequirementV1(input)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['base']});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,base:'unsupported'}})).toMatchObject({status:'SCOPE_UNVERIFIED',missingObjectFactParameterIds:[]});
 expect(resolveCanonicalScopeRequirementV1({...input,parameters:{...input.parameters,base:'supported'}})).toMatchObject({status:'COMPLETED'});
 expect(resolveCanonicalScopeRequirementV1({...input,excludedOperationDefinitionRowIds:new Set(['lower-material'])})).toMatchObject({status:'NOT_APPLICABLE'});
 for(const key of ['badRequiredFact','unknownWithoutRequirement']){
   const bad=structuredClone(g);if(key==='badRequiredFact')bad.scopeRequirementV1.projectOperationContextsV1[0].requiredFactParameterIds=['absent'];
   else bad.scopeRequirementV1.projectOperationContextsV1[0].unknownFactValues={absent:['unknown']};
   expect(()=>resolveCanonicalScopeRequirementV1({...input,graph:bad})).toThrow('scope requirement identity invalid');
 }
});

const bbsGraph={costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',
 kind:'OBJECT_SCOPE',groupId:'bbs',groupTitleRu:'Полнота поставочной BBS',titleRu:'Проверить полную BBS и исходную проектную массу',
 reasonRu:'Проверка не заменяет документированные исходные данные.',objectFactMode:'PROJECT_APPLICABILITY_ONLY',
 objectFactParameterId:'fit',unknownObjectValues:[],exactScopeWhen:{kind:'equals',parameterId:'fit',value:'accepted'},
 requiredFactParameterIds:['cutlist','installed'],coveringRowIds:[],originalRowIds:[],
 sourceEvidence:[{sha256:'1'.repeat(64),locator:'Exact BBS source contract'}]}};
const bbs=(parameters:Record<string,unknown>,g:Record<string,unknown>=bbsGraph,override:Record<string,unknown>={})=>resolveCanonicalScopeRequirementV1({
 graph:g,rowId:'mass-check',parameters,parameterIds:new Set(['fit','cutlist','installed','operation']),
 resourceIds:new Set(['mass-check','supply']),knownQuantityRowIds:new Set<string>(),...override});

test.each([undefined,null,''])('an accepted BBS declaration cannot complete a check with missing required cutlist %s',cutlist=>{
 expect(bbs({fit:'accepted',cutlist,installed:'2000'})).toMatchObject({status:'OBJECT_FACT_REQUIRED',
   missingObjectFactParameterIds:['cutlist'],numericNormAccepted:false,separatePaymentAccepted:false});
});

test('declared object facts are all required, and completion never grants a numeric norm or payment',()=>{
 expect(bbs({fit:'accepted'})).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['cutlist','installed']});
 expect(bbs({fit:'accepted',cutlist:'BBS revision A',installed:'0'})).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false});
 expect(bbs({fit:'other'})).toMatchObject({status:'SCOPE_UNVERIFIED'});
});

test('a wholly excluded conditional operation keeps its own applicability boundary with missing root facts',()=>{
 const g=structuredClone(bbsGraph) as any;g.scopeRequirementV1.projectOperationContextsV1=[{when:{kind:'equals',parameterId:'operation',value:'selected'},resourceRowIds:['supply']}];
 expect(bbs({fit:'accepted',operation:'selected'},g)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['cutlist','installed']});
 expect(bbs({fit:'accepted',operation:'selected'},g,{excludedOperationDefinitionRowIds:new Set(['supply'])})).toMatchObject({status:'NOT_APPLICABLE'});
 expect(bbs({fit:'accepted',operation:'none'},g)).toMatchObject({status:'NOT_APPLICABLE'});
});

test('historical source selection retains its legacy status instead of confirming a declaration with missing object facts',()=>{
 const g=structuredClone(bbsGraph) as any;delete g.scopeRequirementV1.objectFactMode;g.scopeRequirementV1.legacyObjectValue='legacy';
 expect(bbs({fit:'legacy'},g)).toMatchObject({status:'LEGACY_SOURCE_REQUIRED'});
 expect(bbs({fit:'accepted'},g)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:['cutlist','installed']});
});


// ROOT_CURRENT_PROJECT_SCOPE_DOWNSTREAM_R1: actual two current captures, no repository writes.
// Captured baseline numbers below are immutable diagnostic fixtures, not submitted project facts.
import {readFileSync as readCurrentScopeFixtureR1} from 'node:fs';
import {join as joinCurrentScopeFixtureR1} from 'node:path';
import {createHash as hashCurrentScopeR1} from 'node:crypto';
import {compileCanonicalEstimateCore as compileCurrentScopeR1} from './canonicalEstimateCompileCore';
import {canonicalEstimateStableJson as stableCurrentScopeR1} from './canonicalEstimateDeterminism';
import {resolveInclusionGraph as currentScopeInclusionR1} from './inclusionGraph';
import {canonicalApprovedBaselineRuntimeParameters,canonicalApprovedBaselineRuntimeDefaultValue} from './canonicalEstimateApprovedBaseline';
import {canonicalEstimateRevisionDetailFromStorage,canonicalEstimateRevisionRowFromStorage} from './canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from './canonicalEstimatePreliminaryNeedTransport';
import {adaptCanonicalRevisionToStructuredEstimate} from './canonicalEstimateForemanAdapter';
import type {CanonicalEstimateCatalogItem} from './contracts';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import type {StructuredEstimatePayload} from '../../estimateStructuredPipeline/structuredEstimateTypes';
import {buildConsumerCanonicalParameterSession} from '../../../features/consumerRepair/consumerCanonicalParameterEditor';
import {createConsumerRepairRequestDraft as newCurrentScopeDraftR1} from '../../consumerRequests/consumerRequestDraftService';
import {createConsumerRepairRequestItem as newCurrentScopeItemR1} from '../../consumerRequests/consumerRequestItemService';
import {createConsumerMarketplaceLink as newCurrentScopeLinkR1} from '../../consumerRequests/consumerRequestMarketplaceService';
import {appendCanonicalBackendRevisionProjection} from '../../consumerRequests/consumerCanonicalBackendRevisionProjection';
import {consumerEstimateOpenScopeGroups,consumerEstimateScopeDecision} from '../../consumerRequests/consumerEstimateReadiness';
import {consumerEstimateManualQuantityApprovalCandidate} from '../../consumerRequests/consumerEstimateManualQuantityApproval';
import type {ConsumerRepairDraftBundle} from '../../consumerRequests/consumerRequestTypes';
import {compactConsumerRepairBundleForDurableStorage,compactConsumerRepairBundleForEmergencyDurableStorage,
 encodeConsumerRepairBundleForDurableStorage,decodeConsumerRepairBundleFromDurableStorage} from '../../platform/compactConsumerRepairDurableState';

// Deliberately confined to JSON fixtures; no production cast or source authority is added.
type CurrentScopeFixtureJsonR1=Record<string,any>;
type CurrentScopeFamilyR1='scs'|'acs';
// Historical captured JSON bytes remain unchanged. Only this cloned test
// view applies the explicit bounded identity SOURCE_FORWARD, never DB facts.
function applyNativeIdentityTestForwardR478(record:CurrentScopeFixtureJsonR1,family:'scs'|'acs'):CurrentScopeFixtureJsonR1 {
 const overlay=JSON.parse(readCurrentScopeFixtureR1(joinCurrentScopeFixtureR1(__dirname,'../../../..','data/estimate-benchmarks/fixtures/low-current-project-scope-native-parameter-identity-source-forward-r478.json'),'utf8')),a=overlay.families[family];
 if(overlay.contract!=='source-only-low-current-native-parameter-identity-forward/r478'
  ||record.declaration.newProjectParametersSha256!==a.beforeCodeOwnedHashes.newProjectParametersSha256
  ||record.actualPureOutput.candidateComputationSha256!==a.beforeCodeOwnedHashes.representativeComputationSha256)
  throw Error('EXACT_HISTORICAL_SOURCE_FORWARD_PREIMAGE_REQUIRED');
 for(const leaf of a.identityLeaves){const p=record.actualPureOutput.sourceOnlyDefinition.parameters.find((p:CurrentScopeFixtureJsonR1)=>p.parameter_id===leaf.parameterId);
  if(!p||p.truth_metadata.contract!==leaf.before.contract||p.truth_metadata.semantic_parameter_key!==leaf.before.semantic_parameter_key)
   throw Error('EXACT_NEW_PARAMETER_IDENTITY_PREIMAGE_REQUIRED');
  p.truth_metadata={...p.truth_metadata,...leaf.after};
 }
 record.declaration.newProjectParametersSha256=a.afterCodeOwnedHashes.newProjectParametersSha256;
 record.actualPureOutput.candidateComputationSha256=a.afterCodeOwnedHashes.representativeComputationSha256;
 record.sourceIdentityTestForwardR478=overlay.contract;return record;
}
function currentScopeFixtureR1(family:CurrentScopeFamilyR1):CurrentScopeFixtureJsonR1 {
 return applyNativeIdentityTestForwardR478(JSON.parse(readCurrentScopeFixtureR1(joinCurrentScopeFixtureR1(__dirname,'../../../..','data/estimate-benchmarks/fixtures',
  `low-current-project-scope-current-${family}-r1.json`),'utf8')),family);
}
const currentScopeDigestR1=(value:unknown)=>hashCurrentScopeR1('sha256').update(stableCurrentScopeR1(value)).digest('hex');
function currentScopeCatalogR1(f:CurrentScopeFixtureJsonR1):CanonicalEstimateCatalogItem {
 const c=f.actualCurrentCapture.capture,d=f.actualPureOutput.sourceOnlyDefinition;
 return {catalogId:c.definition.catalog_id,releaseId:f.currentContext.definitionReleaseId,namespace:'global',
 domain:f.actualCurrentCapture.publicIdentity.domain,workKey:f.actualCurrentCapture.publicIdentity.work_key,
 titleRu:f.actualCurrentCapture.publicIdentity.title_ru,definitionVersion:c.definition.definition_version,
 applicability:c.definition.applicability,professionalMetadata:{},parameterSchema:d.parameters.map((p:CurrentScopeFixtureJsonR1)=>{
 const t=p.truth_metadata??{},g=t.guide??{};
 return {parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,
 required:p.required,defaultValue:p.default_value??canonicalApprovedBaselineRuntimeDefaultValue(c.baseline,p.parameter_id),
 constraints:p.constraints_json,semanticParameterKey:t.semantic_parameter_key,visibilityRole:t.visibility_role,
 valueSourceRole:t.value_source_role,provenance:t.provenance,preliminaryCompilationAllowed:t.preliminary_compilation_allowed,
 requiredWhen:p.constraints_json?.requiredWhen??t.required_when,visibleWhen:t.visible_when,
 formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
 guide:{guideKind:g.guide_kind,guideShortRu:g.guide_short_ru,sourceRole:g.source_role,sourceDocument:g.source_document,
 sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideValidationPolicy:g.guide_validation_policy,
 guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}};
 })};
}
async function currentScopeCompileR1(f:CurrentScopeFixtureJsonR1,changed:boolean){
 const c=f.actualCurrentCapture.capture,d=changed?f.actualPureOutput.sourceOnlyDefinition:c;
 return compileCurrentScopeR1({operation:'recalculate',compilerVersion:'CURRENT_SCOPE_DIAGNOSTIC_ONLY_R1',catalogId:c.definition.catalog_id,
 primaryMeasureParameterId:c.definition.applicability.primaryMeasureParameterId,parameterDefinitions:d.parameters,
 formulaDefinitions:d.formulas,resourceDefinitions:d.resources,submittedParameters:c.baseline.input_values,confirmedParameters:{},
 priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:currentScopeDigestR1});
}
function currentScopeBundleR1(payload:StructuredEstimatePayload):ConsumerRepairDraftBundle{
 const ai=buildStructuredEstimateRequestDraft(payload),draft=newCurrentScopeDraftR1({consumerUserId:'source-test-only',aiDraft:ai});
 const bundle:ConsumerRepairDraftBundle={draft,items:ai.items.map(item=>newCurrentScopeItemR1({...item,requestDraftId:draft.id})),
 media:[],pdfs:[],projectExecutionDrafts:[],marketplaceLink:newCurrentScopeLinkR1(draft.id),events:[],
 structuredEstimatePayload:ai.structuredEstimatePayload,canonicalParameterRequirementTables:ai.canonicalParameterRequirementTables};
 return appendCanonicalBackendRevisionProjection({previousBundle:null,nextBundle:bundle,payload});
}
async function currentScopeBuildR1(family:CurrentScopeFamilyR1){
 const f=currentScopeFixtureR1(family),c=f.actualCurrentCapture.capture;
 const [before,after]=await Promise.all([currentScopeCompileR1(f,false),currentScopeCompileR1(f,true)]);
 const stored={id:c.definition.id,release_id:f.currentContext.definitionReleaseId,catalog_id:c.definition.catalog_id,
 definition_version_id:c.definition.id,revision_number:1,status:'ready',compiler_owner:'backend',currency_code:'KGS',
 compiler_version:'CURRENT_SCOPE_DIAGNOSTIC_ONLY_R1',created_at:'2026-10-26T00:00:00Z',row_count:after.rows.length,
 checksum_sha256:currentScopeDigestR1(after),input_parameters:after.parameters,price_snapshot_ids:[],totals:after.totals,
 accepted_baseline_snapshot:canonicalApprovedBaselineRuntimeParameters(c.baseline),user_input_snapshot:c.baseline.input_values,
 amendment_contract:{parameterSources:{preliminaryNeeds:after.preliminaryNeeds}}};
 const revision=canonicalEstimateRevisionDetailFromStorage(JSON.parse(JSON.stringify(stored))),catalog=currentScopeCatalogR1(f);
 const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:after.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
 const bundle=currentScopeBundleR1(payload),scope=revision.preliminaryNeeds?.find(need=>need.scopeRequirementDecision?.kind==='OBJECT_SCOPE');
 if(!scope)throw new Error('ACTUAL_CURRENT_PROJECT_SCOPE_ACTIVE_DIAGNOSTIC_REQUIRED');
 return {f,c,before,after,stored,revision,catalog,payload,bundle,scope};
}
const currentScopeCacheR1=new Map<CurrentScopeFamilyR1,ReturnType<typeof currentScopeBuildR1>>();
function currentScopeR1(family:CurrentScopeFamilyR1){let task=currentScopeCacheR1.get(family);if(!task){task=currentScopeBuildR1(family);currentScopeCacheR1.set(family,task);}return task;}
function currentScopeColdR1(bundle:ConsumerRepairDraftBundle,emergency:boolean){
 const compact=emergency?compactConsumerRepairBundleForEmergencyDurableStorage(bundle):compactConsumerRepairBundleForDurableStorage(bundle);
 const reopened=decodeConsumerRepairBundleFromDurableStorage(JSON.parse(JSON.stringify(encodeConsumerRepairBundleForDurableStorage(compact))));
 if(!reopened)throw new Error('EXISTING_DURABLE_CODEC_REJECTED_DIAGNOSTIC');return reopened;
}
function assertCurrentScopeOpenGateR435(bundle:ConsumerRepairDraftBundle,scope:NonNullable<ReturnType<typeof canonicalEstimateRevisionDetailFromStorage>['preliminaryNeeds']>[number]){
 const item=bundle.items.find(i=>i.sourceParameters?.rowCode===scope.rowId)!;
 const parsed=consumerEstimateScopeDecision(item),groups=consumerEstimateOpenScopeGroups(bundle);
 expect(parsed).toEqual(scope.scopeRequirementDecision);
 const group=groups.find(g=>g.groupId===parsed!.groupId);
 // Groups expose rowIds[], not the individual decision's rowId field.
 expect(group).toBeDefined();expect(group!.rowIds).toContain(scope.rowId);
 expect(group!.statuses).toContain('OBJECT_FACT_REQUIRED');expect(group!.kinds).toContain('OBJECT_SCOPE');
 console.info(JSON.stringify({probe:'CURRENT_SCOPE_OPEN_GATE_R435',rowId:scope.rowId,itemStatus:parsed!.status,
  groupId:group!.groupId,rowIds:group!.rowIds,statuses:group!.statuses,kinds:group!.kinds}));
}
for(const family of ['scs','acs'] as const)describe(`ROOT_CURRENT_PROJECT_SCOPE_DOWNSTREAM_R1 ${family}`,()=>{
 test('baseline omits every new project fact and both API default paths remain null',()=>{
  const f=currentScopeFixtureR1(family),c=f.actualCurrentCapture.capture,defaults=canonicalApprovedBaselineRuntimeParameters(c.baseline),catalog=currentScopeCatalogR1(f);
  expect(Object.keys(defaults).length).toBeGreaterThan(0);
  for(const id of f.actualPureOutput.newProjectParameterIds){
   expect(Object.hasOwn(c.baseline.input_values,id)).toBe(false);expect(Object.hasOwn(defaults,id)).toBe(false);
   expect(canonicalApprovedBaselineRuntimeDefaultValue(c.baseline,id)).toBeNull();
   expect(catalog.parameterSchema.find(p=>p.parameterId===id)?.defaultValue).toBeNull();
   expect(f.actualPureOutput.sourceOnlyDefinition.parameters.find((p:CurrentScopeFixtureJsonR1)=>p.parameter_id===id).default_value).toBeNull();
  }
 });
 test('core amendment API and JSON reread retain the same active OBJECT_SCOPE and missing record IDs',async()=>{
  const s=await currentScopeR1(family),wire=projectCanonicalEstimatePreliminaryNeedTransport(s.stored);
  const parsed=canonicalEstimateRevisionDetailFromStorage(JSON.parse(JSON.stringify(s.stored)));
  const need=parsed.preliminaryNeeds!.find(n=>n.rowId===s.scope.rowId)!;
  expect(s.scope.scopeRequirementDecision).toMatchObject({kind:'OBJECT_SCOPE',status:'OBJECT_FACT_REQUIRED',numericNormAccepted:false,separatePaymentAccepted:false});
  expect(need.scopeRequirementDecision).toEqual(s.scope.scopeRequirementDecision);
  expect(need.missingParameterIds.length).toBeGreaterThan(0);expect(need.selected).toBe(false);
  expect(need.quantity).toBe(s.scope.quantity);expect(wire.preliminaryNeeds.find(n=>n.rowId===need.rowId)?.scopeRequirementDecision).toEqual(need.scopeRequirementDecision);
 });
 test('cold editor has real bound object questions with no schema or reference value promoted into input',async()=>{
  const s=await currentScopeR1(family),session=buildConsumerCanonicalParameterSession({catalog:s.catalog,revision:s.revision,draftId:s.bundle.draft.id});
  for(const id of s.f.actualPureOutput.newProjectParameterIds){const p=session.parameters.find(p=>p.parameterId===id)!;
   expect(p).toBeDefined();expect(p.value).toBeNull();expect(p.referenceValue??null).toBeNull();expect(p.inputOwnership).toBe('USER_INPUT');
   expect(p.consumerInputRole).toBe('OBJECT_FACT');expect(Object.hasOwn(s.revision.parameters,id)).toBe(false);
  }
  assertCurrentScopeOpenGateR435(s.bundle,s.scope);
 });
 test('all native IDs and numeric quantities survive once with unchanged totals and no extra paid or procurement rows',async()=>{
  const s=await currentScopeR1(family),identity=(r:{row_id:string})=>r.row_id;
  const before=[...s.before.rows,...s.before.preliminaryNeeds],after=[...s.after.rows,...s.after.preliminaryNeeds];
  expect(after.map(identity).sort()).toEqual(before.map(identity).sort());
  const beforeIds=new Set(before.map(identity)),afterIds=new Set(after.map(identity));
  const inactive=s.c.resources.filter((r:CurrentScopeFixtureJsonR1)=>!afterIds.has(r.row_id));
  expect(inactive.map((r:CurrentScopeFixtureJsonR1)=>r.row_id).sort()).toEqual(s.c.resources.filter((r:CurrentScopeFixtureJsonR1)=>!beforeIds.has(r.row_id)).map((r:CurrentScopeFixtureJsonR1)=>r.row_id).sort());
  for(const r of inactive){expect(currentScopeInclusionR1(r.inclusion_ast,s.before.parameters).value).toBe(false);
   expect(currentScopeInclusionR1(r.inclusion_ast,s.after.parameters).value).toBe(false);}
  const accounted=[...after.map(identity),...inactive.map((r:CurrentScopeFixtureJsonR1)=>r.row_id)];
  expect(accounted.sort()).toEqual(s.c.resources.map((r:CurrentScopeFixtureJsonR1)=>r.row_id).sort());
  expect(new Set(accounted).size).toBe(s.c.resources.length);
  console.info(JSON.stringify({probe:'CURRENT_NATIVE_INACTIVE_LEDGER_R435',family,compiledIds:after.map(identity),
   inactive:inactive.map((r:CurrentScopeFixtureJsonR1)=>({rowId:r.row_id,reason:'EXISTING_INCLUSION_FALSE'}))}));
  const quantity=(r:typeof before[number])=>({id:r.row_id,quantity:r.quantity});
  expect(after.map(quantity).sort((a,b)=>a.id.localeCompare(b.id))).toEqual(before.map(quantity).sort((a,b)=>a.id.localeCompare(b.id)));
  const {excludedRowCount:beforeExcluded,...beforeMoney}=s.before.totals,{excludedRowCount:afterExcluded,...afterMoney}=s.after.totals;
  expect(afterMoney).toEqual(beforeMoney);
  expect(afterExcluded+s.after.preliminaryNeeds.length).toBe(beforeExcluded+s.before.preliminaryNeeds.length);
  expect(s.after.rows.some(r=>r.row_id===s.scope.rowId)).toBe(false);
  const item=s.bundle.items.find(i=>i.sourceParameters?.rowCode===s.scope.rowId)!;
  expect(item.sourceParameters).toMatchObject({includedInEstimate:false,includedInProcurement:false,payable:false});
 });
 test('structured draft preserves the native informational ID and open scope despite unselected cost',async()=>{
  const s=await currentScopeR1(family),item=s.bundle.items.find(i=>i.sourceParameters?.rowCode===s.scope.rowId)!;
  expect(s.bundle.items.filter(i=>i.sourceParameters?.rowCode===s.scope.rowId)).toHaveLength(1);
  expect(consumerEstimateScopeDecision(item)).toEqual(s.scope.scopeRequirementDecision);
  expect(item.sourceParameters?.includedInEstimate).toBe(false);expect(item.sourceParameters?.includedInProcurement).toBe(false);
  const excluded=structuredClone(s.bundle);excluded.items.find(i=>i.id===item.id)!.sourceParameters!.includedInEstimate=false;
  assertCurrentScopeOpenGateR435(excluded,s.scope);
 });
 test('normal and emergency reopen retain the gate, with non-vacuous controls for BOTH saved manual modes',async()=>{
  const s=await currentScopeR1(family);
  for(const emergency of [false,true]){const reopened=currentScopeColdR1(s.bundle,emergency);
   assertCurrentScopeOpenGateR435(reopened,s.scope);
   expect(consumerEstimateManualQuantityApprovalCandidate(reopened)).toBeNull();
  }
  // Controlled source-gap witness only: not a new definition, paid row or actual project claim.
  // Reuse the SAME native carrier ID and actual calculated rows. Only this diagnostic need is changed.
  for(const mode of ['MANUAL_QUANTITIES','MANUAL_PRELIMINARY'] as const){
   const payload=structuredClone(s.payload),b=payload.canonicalBackend!,need=structuredClone(b.preliminaryNeeds!.find(n=>n.rowId===s.scope.rowId)!);
   const id=s.f.actualPureOutput.newProjectParameterIds[0] as string;
   delete need.scopeRequirementDecision;need.calculationTrace=undefined;need.needState='QUANTITY_REQUIRED';need.missingParameterIds=[id];
   need.quantity=mode==='MANUAL_QUANTITIES'?'10':null;need.manualQuantityOverride=mode==='MANUAL_QUANTITIES';need.selected=false;need.procurementEligible=false;
   b.preliminaryNeeds=[need];b.parameterRequirements=[{parameterId:id,titleRu:'DIAGNOSTIC_ONLY_APPLICATION_NORM',unitId:need.unitId,
    visibilityRole:'INTERNAL_ONLY',valueSourceRole:'UNRESOLVED_APPLICATION_NORM',sourceConfirmationRequired:false,guideShortRu:null}];
   const control=currentScopeBundleR1(payload);expect(consumerEstimateManualQuantityApprovalCandidate(control)?.mode).toBe(mode);
   const blocked=structuredClone(control),item=blocked.items.find(i=>i.sourceParameters?.rowCode===need.rowId)!;
   item.sourceParameters!.canonicalScopeRequirementDecisionV1=s.scope.scopeRequirementDecision;
   blocked.structuredEstimatePayload!.canonicalBackend!.preliminaryNeeds![0]!.scopeRequirementDecision=s.scope.scopeRequirementDecision;
   expect(consumerEstimateManualQuantityApprovalCandidate(blocked)).toBeNull();
   for(const emergency of [false,true])expect(consumerEstimateManualQuantityApprovalCandidate(currentScopeColdR1(blocked,emergency))).toBeNull();
  }
 });
 test('actual graph completion and incompatible decision have no numeric norm or separate-payment authority',async()=>{
  const s=await currentScopeR1(family),d=s.f.actualPureOutput.sourceOnlyDefinition;
  const carrier=d.resources.find((r:CurrentScopeFixtureJsonR1)=>r.row_id===s.scope.rowId),g=carrier.resource_graph;
  const decisionId=g.scopeRequirementV1.objectFactParameterId,decisionParameter=d.parameters.find((p:CurrentScopeFixtureJsonR1)=>p.parameter_id===decisionId);
  const parameters={...s.c.baseline.input_values};
  for(const id of s.f.actualPureOutput.newProjectParameterIds)parameters[id]=id===decisionId?decisionParameter.constraints_json.values[1]:'DIAGNOSTIC_ONLY_PROJECT_RECORD';
  const run=(values:Record<string,unknown>)=>resolveCanonicalScopeRequirementV1({graph:g,rowId:s.scope.rowId,parameters:values,
   parameterIds:new Set<string>(d.parameters.map((p:CurrentScopeFixtureJsonR1)=>p.parameter_id)),resourceIds:new Set<string>(d.resources.map((r:CurrentScopeFixtureJsonR1)=>r.row_id)),knownQuantityRowIds:new Set<string>()});
  expect(run(parameters)).toMatchObject({status:'COMPLETED',numericNormAccepted:false,separatePaymentAccepted:false});
  expect(run({...parameters,[decisionId]:decisionParameter.constraints_json.values[2]})).toMatchObject({status:'SCOPE_UNVERIFIED',numericNormAccepted:false,separatePaymentAccepted:false});
  const missing={...parameters};delete missing[s.f.actualPureOutput.newProjectParameterIds[0]];
  expect(run(missing)?.status).toBe('OBJECT_FACT_REQUIRED');
 });
});


// SOURCE-only existing callback selector. No actual pointer/membership, HTTP,
// project readback, DB or normative-source admission is claimed by these tests.
import {createMasterCurrentProjectScopeCoreCallbackR1} from '../../../../scripts/estimate/r4a13/masterCurrentProjectScopeCoreCallbackR1';
import * as publisherCallbackCoreR447 from './canonicalEstimateCompileCore';
import type {MasterRetainedBindingGuardInputR1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
function publisherCallbackSetupR447(family:CurrentScopeFamilyR1='scs') {
 const f=currentScopeFixtureR1(family),c=f.actualCurrentCapture.capture,candidate=f.actualPureOutput.sourceOnlyDefinition;
 const mode={...f.declaration,originCurrentMembershipV1:{contract:'master-project-scope-origin-current-membership/r1',
  frozenOriginDefinitionReleaseId:f.currentContext.definitionReleaseId,frozenOriginSearchReleaseId:f.currentContext.searchReleaseId,
  nativeCaptureSha256:f.actualPureOutput.capturedParentSha256}};
 const captured={...candidate,parameters:c.parameters,formulas:c.formulas,resources:c.resources};
 const source=c.normativeSources.find((s:CurrentScopeFixtureJsonR1)=>c.normativeLocators.some((l:CurrentScopeFixtureJsonR1)=>l.source_id===s.id));
 const {created_at:_timestamp,...managed}=source;
 const locators=c.normativeLocators.filter((l:CurrentScopeFixtureJsonR1)=>l.source_id===source.id);
 const opt={capturedParent:c,capturedParentSha256:f.actualPureOutput.capturedParentSha256,newParameterSources:{},projectScopeMetadataOnlyV1:mode};
 const guardInput:MasterRetainedBindingGuardInputR1={config:{stopCode:'SOURCE_CALLBACK_TEST_ONLY',catalogId:c.definition.catalog_id,
  parentReleaseId:'679d75f0-6a6b-584b-9458-683bb1fe3edc',parentSearchReleaseId:'2693a339-4262-5709-afcc-ffa2793b4945',
  binding:{retainParentBindings:opt,reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',
   locatorExcerptHashKind:'CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1',source,locators}}},newSource:managed,newLocators:locators};
 const callback=createMasterCurrentProjectScopeCoreCallbackR1({guardInput,compilerVersion:'SOURCE_CALLBACK_TEST_ONLY_R447',currencyCode:'KGS'});
 return {f,c,captured,candidate,guardInput,opt,callback};
}
describe('ROOT_CURRENT_SCOPE_PUBLISHER_CALLBACK_R447',()=>{
 test.each(['scs','acs'] as const)('real existing core preserves the native baseline and keeps all new project records absent: %s',async family=>{
  const s=publisherCallbackSetupR447(family),before=stableCurrentScopeR1(s.c);
  const result=await s.callback({captured:s.captured,candidate:s.candidate});
  expect(result).toMatchObject({proofScope:'SOURCE_METADATA_DIAGNOSTIC_BASELINE_ONLY',sourceAdmission:false,
   engineeringAcceptance:false,documentContentsAuthenticated:false,actualProjectReadback:false,FULL:false,
   nativeResourceCount:s.c.resources.length,nativeQuantitiesUnchanged:true,nativePaymentAndProcurementOwnersUnchanged:true,
   diagnosticMoneyUnchanged:true,scopeStatus:'OBJECT_FACT_REQUIRED',newRows:0,newPaidOwners:0});
  expect(result.absentProjectParameterIds).toEqual(s.opt.projectScopeMetadataOnlyV1.newProjectParameterIds);
  const missing=result.actualScopeMissingParameterIds as string[];
  expect(missing.length).toBeGreaterThan(0);
  expect(missing.every(id=>s.opt.projectScopeMetadataOnlyV1.newProjectParameterIds.includes(id))).toBe(true);
  expect(stableCurrentScopeR1(s.c)).toBe(before);
 });
 test('same declared mode cannot promote a new object reference into the native baseline',async()=>{
  const s=publisherCallbackSetupR447(),id=s.opt.projectScopeMetadataOnlyV1.newProjectParameterIds[0]!;
  s.c.baseline.input_values[id]='HOSTILE_TEST_ONLY_NOT_AN_OBJECT_DOCUMENT';
  await expect(s.callback({captured:s.captured,candidate:s.candidate})).rejects.toThrow();
 });
 test('missing registered mode refuses before any core callback can claim a proof',async()=>{
  const s=publisherCallbackSetupR447();delete (s.opt as CurrentScopeFixtureJsonR1).projectScopeMetadataOnlyV1;
  await expect(s.callback({captured:s.captured,candidate:s.candidate})).rejects.toThrow('EXPLICIT_REGISTERED_SCOPE_MODE_REQUIRED');
 });
 // Scoped fault injection starts from the actual existing compiler result.
 // It is not a replacement compiler or an accepted calculation receipt.
 test.each(['quantity','procurement','scope'] as const)('rejects one hostile mutation of actual candidate core output: %s',async kind=>{
  const s=publisherCallbackSetupR447(),real=publisherCallbackCoreR447.compileCanonicalEstimateCore;
  const spy=jest.spyOn(publisherCallbackCoreR447,'compileCanonicalEstimateCore');
  spy.mockImplementationOnce(real).mockImplementationOnce(async input=>{
   const result=await real(input);
   if(kind==='quantity')result.rows[0]!.quantity='999999';
   else if(kind==='procurement')result.rows[0]!.included_in_procurement=!result.rows[0]!.included_in_procurement;
   else {
    const carrier=result.preliminaryNeeds.find(need=>(need.calculation_trace as CurrentScopeFixtureJsonR1)?.resourceGraph?.scopeRequirementDecisionV1?.kind==='OBJECT_SCOPE')!;
    expect(carrier).toBeDefined();
    const decision=(carrier.calculation_trace as CurrentScopeFixtureJsonR1).resourceGraph.scopeRequirementDecisionV1;
    decision.status='COMPLETED';decision.missingObjectFactParameterIds=[];
   }
   return result;
  });
  try {
   await expect(s.callback({captured:s.captured,candidate:s.candidate})).rejects.toThrow(kind==='quantity'
    ?'NATIVE_QUANTITY_OR_MONEY_CHANGED':kind==='procurement'?'PAYMENT_OR_PROCUREMENT_OWNERS_CHANGED':'REAL_OBJECT_SCOPE_MUST_STAY_OPEN');
  } finally {spy.mockRestore();}
 });
});


// SOURCE-only two real metadata Config callers. Invocation-only controls below
// are explicitly TEST_ONLY; the existing publisher is not invoked. No live
// pointer is read/pinned, and held native shapes are not current DB authority.
import {lowCurrentScsCurrentProjectScopeMetadataConfigR5} from '../../../../scripts/estimate/r4a13/prepareLowCurrentScsPostsSingleSuccessorR24';
import {accessControlCurrentProjectScopeMetadataConfigR5} from '../../../../scripts/estimate/r4a13/prepareAccessControlLockWholeFactoryR24';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1,type MasterSingleDefinitionSuccessorConfig} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {AutomaticOwnerDefinition} from '../v4/automaticConstructionDefinitionR1';
import type {MasterProjectScopeMetadataOnlyV1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
function nativeScopeConfigSetupR460(family:CurrentScopeFamilyR1='scs') {
 const f=currentScopeFixtureR1(family),c=f.actualCurrentCapture.capture;
 const data=JSON.parse(readCurrentScopeFixtureR1(joinCurrentScopeFixtureR1(__dirname,'../../../..',
  'data/estimate-benchmarks/fixtures/low-current-project-scope-native-host-config-data-r460.json'),'utf8'));
 const slots=data.families[family],old=slots.binding.retainParentBindings;
 const mode:MasterProjectScopeMetadataOnlyV1={...f.declaration,originCurrentMembershipV1:{
  contract:'master-project-scope-origin-current-membership/r1',frozenOriginDefinitionReleaseId:f.currentContext.definitionReleaseId,
  frozenOriginSearchReleaseId:f.currentContext.searchReleaseId,nativeCaptureSha256:old.capturedParentSha256}};
 const captured:AutomaticOwnerDefinition={...f.actualPureOutput.sourceOnlyDefinition,parameters:c.parameters,formulas:c.formulas,resources:c.resources};
 const retained={capturedParent:c,capturedParentSha256:old.capturedParentSha256,newParameterSources:{}};
 const host:MasterSingleDefinitionSuccessorConfig={...slots,
  stopCode:'SOURCE_TEST_ONLY_CONFIG_R460',applicationName:'SOURCE_TEST_ONLY_NOT_PUBLISHER',expectedBranch:'TEST_ONLY_NOT_INSPECTED',
  masterPath:'TEST_ONLY_NOT_READ',masterSha256:'TEST_ONLY_NOT_AUTHORITY',currentReleasePath:'TEST_ONLY_NOT_READ',outputRoot:'TEST_ONLY_NO_OUTPUT',
  // Controlled historical unit input only, not an assertion about active DB.
  parentReleaseId:'679d75f0-6a6b-584b-9458-683bb1fe3edc',parentSearchReleaseId:'2693a339-4262-5709-afcc-ffa2793b4945',
  sourcePaths:[`data/estimate-benchmarks/fixtures/low-current-project-scope-current-${family}-r1.json`],
  parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:c.resources,
  shortInput:structuredClone(c.baseline.input_values),acceptanceInput:structuredClone(c.baseline.input_values),
  expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,
  validationScenario:c.baseline.validation_scenario_refs[0].scenario,
  binding:{...slots.binding,retainParentBindings:retained},
  search:{...slots.search,extraSearchTermsRu:'SOURCE_TEST_ONLY_UNUSED_BY_SCOPE_METADATA_SEARCH_PRESERVE'},
  forbiddenAdjacentMatchers:[/SOURCE_TEST_ONLY_ADJACENT_SCOPE_NEVER_PUBLISHED/],owner:'SOURCE_TEST_ONLY',receiptFileStem:'SOURCE_TEST_ONLY',
  verifyCore:async()=>{throw Error('HOST_PLACEHOLDER_CALLBACK_MUST_NOT_RUN');}};
 const guardConfig={...host,binding:{...host.binding,retainParentBindings:{...retained,projectScopeMetadataOnlyV1:mode}}};
 const guard=assembleMasterSingleDefinitionManagedRegistryCandidateR1(guardConfig,{projectSourcePackage:null,projectSourcePackageSet:null});
 const core=createMasterCurrentProjectScopeCoreCallbackR1({guardInput:guard.retentionCandidate,
  compilerVersion:'SOURCE_TEST_ONLY_REAL_CONFIG_CALLBACK_R460',currencyCode:'KGS'});
 const make=family==='scs'?lowCurrentScsCurrentProjectScopeMetadataConfigR5:accessControlCurrentProjectScopeMetadataConfigR5;
 return {f,c,slots,mode,captured,host,core,make};
}
describe('ROOT_TWO_REAL_NATIVE_SCOPE_CONFIGS_R460',()=>{
 test.each(['scs','acs'] as const)('actual metadata Config invokes the same accepted core exactly once, retaining native quantities and open object needs: %s',async family=>{
  const s=nativeScopeConfigSetupR460(family),frozen=stableCurrentScopeR1({capture:s.c,host:s.host,mode:s.mode,captured:s.captured});
  let calls=0;
  const config=s.make({hostConfig:s.host,capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:['data/estimate-benchmarks/fixtures/low-current-project-scope-native-host-config-data-r460.json'],
   verifyCurrentScopeCore:async value=>{calls++;expect(value.captured).toBe(s.captured);
    expect(value.candidate.parameters).toEqual(s.f.actualPureOutput.sourceOnlyDefinition.parameters);
    expect(value.candidate.formulas).toEqual(s.c.formulas);expect(value.candidate.resources).toEqual(s.f.actualPureOutput.sourceOnlyDefinition.resources);
    return s.core(value);}});
  expect(calls).toBe(0);expect(config.formulaDefinitions).toEqual(s.c.formulas);
  expect(config.resourceDefinitions.map(row=>row.row_id)).toEqual(s.c.resources.map((row:CurrentScopeFixtureJsonR1)=>row.row_id));
  expect(config.binding.reuseExistingNormativeRegistry).toEqual(s.host.binding.reuseExistingNormativeRegistry);
  expect(config.search).toEqual(s.host.search);expect(config.shortInput).toEqual(s.c.baseline.input_values);
  const result=await config.verifyCore();
  expect(result).toMatchObject({scopeMetadataOnly:true,sourceAdmission:false,engineeringAcceptance:false,FULL:false,
   nativeResourceCount:s.c.resources.length,nativeQuantitiesUnchanged:true,nativePaymentAndProcurementOwnersUnchanged:true,
   diagnosticMoneyUnchanged:true,scopeStatus:'OBJECT_FACT_REQUIRED',newRows:0,newPaidOwners:0});
  expect(result.absentProjectParameterIds).toEqual(s.mode.newProjectParameterIds);expect(calls).toBe(1);
  await expect(config.verifyCore()).rejects.toThrow('CORE_CALLBACK_ALREADY_INVOKED');expect(calls).toBe(1);
  expect(stableCurrentScopeR1({capture:s.c,host:s.host,mode:s.mode,captured:s.captured})).toBe(frozen);
 });
 test('native row mutation is rejected before a callback is invoked',()=>{
  const s=nativeScopeConfigSetupR460();let calls=0;
  const resources=structuredClone(s.host.resourceDefinitions);resources[0]!.quantity_policy='HOSTILE_TEST_ONLY';
  expect(()=>s.make({hostConfig:{...s.host,resourceDefinitions:resources},capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],
   verifyCurrentScopeCore:async()=>{calls++;return {};}})).toThrow('FULL_NATIVE_CAPTURE_MISMATCH');expect(calls).toBe(0);
 });
 test('new project reference cannot be inserted into the diagnostic baseline',()=>{
  const s=nativeScopeConfigSetupR460(),id=s.mode.newProjectParameterIds[0]!;
  expect(()=>s.make({hostConfig:{...s.host,shortInput:{...s.host.shortInput,[id]:'HOSTILE_NOT_A_PROJECT_FACT'}},
   capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],verifyCurrentScopeCore:s.core})).toThrow('DIAGNOSTIC_BASELINE_CANNOT_GAIN_OBJECT_FACTS');
 });
 test('mixed paid binding is rejected in the metadata-only Config',()=>{
  const s=nativeScopeConfigSetupR460();
  expect(()=>s.make({hostConfig:{...s.host,binding:{...s.host.binding,additionalRowIds:['HOSTILE_TEST_ONLY']}},
   capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],verifyCurrentScopeCore:s.core})).toThrow('EXACT_NATIVE_SOURCE_REUSE_REQUIRED');
 });
 test('same native rows cannot close a changed registered graph digest',()=>{
  const s=nativeScopeConfigSetupR460();
  expect(()=>s.make({hostConfig:s.host,capturedParentDefinition:s.captured,mode:{...s.mode,resourceGraphChangesSha256:'0'.repeat(64)},
   newSourcePaths:[],verifyCurrentScopeCore:s.core})).toThrow();
 });
 test('hostile source identity is rejected against the same immutable native source capture',()=>{
  const s=nativeScopeConfigSetupR460('acs'),reuse=s.host.binding.reuseExistingNormativeRegistry!;
  expect(()=>s.make({hostConfig:{...s.host,binding:{...s.host.binding,reuseExistingNormativeRegistry:{...reuse,source:{...reuse.source,source_key:'HOSTILE_TEST_ONLY_NONEMPTY_SOURCE'}}}},
   capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],verifyCurrentScopeCore:s.core})).toThrow();
 });
 test('a failed injected callback emits no success receipt and cannot be invoked twice',async()=>{
  const s=nativeScopeConfigSetupR460();let calls=0;
  const config=s.make({hostConfig:s.host,capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],
   verifyCurrentScopeCore:async()=>{calls++;throw Error('SOURCE_TEST_ONLY_CALLBACK_FAILURE');}});
  expect(calls).toBe(0);await expect(config.verifyCore()).rejects.toThrow('SOURCE_TEST_ONLY_CALLBACK_FAILURE');
  expect(calls).toBe(1);await expect(config.verifyCore()).rejects.toThrow('CORE_CALLBACK_ALREADY_INVOKED');expect(calls).toBe(1);
 });
});


// Real native Config -> retained representative -> clone -> the publisher's
// exact shared pure parameter validator. Genuine HOLD parent composition still
// blocks the actual publisher before any SQL; identity success is not admission.
import type {Client as IdentityBoundaryClientR478} from 'pg';
import {createCanonicalDefinitionClonePlan as cloneIdentityBoundaryR478,
 assertCanonicalPublisherParameterPayloadR1 as assertIdentityPayloadR478,
 preflightCanonicalDefinitionPublishPlans as preflightIdentityBoundaryR478} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {prepareMasterRetainedBindingRepresentativeR1 as retainedIdentityBoundaryR478,
 masterProjectScopeMetadataCompactR1 as compactIdentityBoundaryR478,
 assertMasterRetainedBindingPlanR1 as planIdentityBoundaryR478} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
function nativeIdentityPayloadPlanR478(family:CurrentScopeFamilyR1){
 const s=nativeScopeConfigSetupR460(family),config=s.make({hostConfig:s.host,capturedParentDefinition:s.captured,
  mode:s.mode,newSourcePaths:[],verifyCurrentScopeCore:s.core}),c=s.c,p=s.mode.capturedContentPassport;
 const managed=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null});
 const representative=retainedIdentityBoundaryR478(managed.retentionCandidate,{parameters:[...config.parameterDefinitions],formulas:[...config.formulaDefinitions],resources:[...config.resourceDefinitions],
  newBindings:[],successorProvenance:{parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
   capturedParentSha256:s.host.binding.retainParentBindings!.capturedParentSha256,
   projectScopeMetadataOnlyV1:compactIdentityBoundaryR478(config.binding.retainParentBindings!)}});
 // Reuse existing native IDs only in this non-writing test. Actual publication
 // IDs stay exclusively with the existing publisher after the ROOT SQL gate.
 const plan=cloneIdentityBoundaryR478({contract:config.contract,definition:{id:c.definition.id,releaseId:config.parentReleaseId,
  catalogId:config.catalogId,definitionVersion:c.definition.definition_version,passport:structuredClone(c.definition.passport),
  applicability:structuredClone(c.definition.applicability),definitionSha256:c.definition.definition_sha256,sourceMetadata:representative.sourceMetadata},
  representative:{parameters:[...config.parameterDefinitions],formulas:[...config.formulaDefinitions],resources:[...config.resourceDefinitions],bindings:[...representative.bindings],
   baseline:{...structuredClone(c.baseline),parameter_schema_sha256:currentScopeDigestR1(config.parameterDefinitions),normative_source_ids:structuredClone(representative.normativeSourceIds)},passport:structuredClone(p)},
  parameterTruthMetadata:parameter=>structuredClone(parameter.truth_metadata),resourceId:resource=>String(resource.id),
  resourceSemanticOwner:resource=>String(resource.semantic_owner),resourceSha256:resource=>String(resource.row_sha256),
  baseline:{id:c.baseline.id,key:c.baseline.baseline_key,sourceDefinitionVersionId:c.definition.id,validationScenarioRefs:structuredClone(c.baseline.validation_scenario_refs),
   acceptanceEvidenceSha256:c.baseline.acceptance_evidence_sha256,acceptedReleaseId:config.parentReleaseId,supersedesBaselineId:c.baseline.id},
  passport:{physicalResultRu:String(p.physical_result_ru),excludedScopeRu:structuredClone(p.excluded_scope_ru),decision:structuredClone(p.decision),payloadSha256:String(p.payload_sha256),sourceHead:String(p.source_head),sourceTree:String(p.source_tree)},
  bindingApplicability:binding=>structuredClone(binding.applicability),expectedNormativeBindingCount:representative.expectedNormativeBindingCount});
 planIdentityBoundaryR478(managed.retentionCandidate,plan,representative);return {s,config,plan};
}
function identityBoundaryTransportR478(){
 const query=jest.fn(async()=>{throw Error('UNEXPECTED_SQL_BEFORE_COMPOSITION_ADMISSION');});
 return {client:{query} as unknown as IdentityBoundaryClientR478,query};
}
describe('ROOT_NATIVE_PARAMETER_PUBLISHER_BOUNDARY_R478',()=>{
 test.each(['scs','acs'] as const)('real native Config preserves identities while actual publisher rejects incomplete composition without SQL: %s',async family=>{
  const {s,config,plan}=nativeIdentityPayloadPlanR478(family),n=s.c.parameters.length;
  expect(config.parameterDefinitions.slice(0,n)).toEqual(s.c.parameters);expect(config.formulaDefinitions).toEqual(s.c.formulas);
  expect(config.resourceDefinitions).toEqual(s.f.actualPureOutput.sourceOnlyDefinition.resources);
  expect(plan.parameters.slice(n).map(p=>p.parameter_id)).toEqual(s.mode.newProjectParameterIds);
  for(const p of plan.parameters){expect(p.truth_metadata.contract).toBe(config.contract);
   expect(p.truth_metadata.semantic_parameter_key).toBe(`${config.catalogId}:${p.parameter_id}`);}
  for(const p of plan.parameters.slice(n)){expect(p.default_value).toBeNull();expect(Object.hasOwn(s.c.baseline.input_values,p.parameter_id)).toBe(false);}
  expect(()=>assertIdentityPayloadR478(plan)).not.toThrow();
  const transport=identityBoundaryTransportR478();
  await expect(preflightIdentityBoundaryR478(transport.client,[plan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES:');
  expect(transport.query).not.toHaveBeenCalled();
 });
 for(const family of ['scs','acs'] as const)test.each(['contract_missing','contract_wrong','semantic_missing','semantic_wrong'] as const)
 (`shared publisher validator rejects ${family} new-field %s; actual incomplete plan remains stopped before SQL`,async kind=>{
  const {s,plan}=nativeIdentityPayloadPlanR478(family),p=plan.parameters.find(p=>p.parameter_id===s.mode.newProjectParameterIds[0])!;
  if(kind==='contract_missing')delete p.truth_metadata.contract;
  if(kind==='contract_wrong')p.truth_metadata.contract='HOSTILE_NONEMPTY_OTHER_CONTRACT';
  if(kind==='semantic_missing')delete p.truth_metadata.semantic_parameter_key;
  if(kind==='semantic_wrong')p.truth_metadata.semantic_parameter_key=plan.definition.catalog_id+':HOSTILE_NONEMPTY_OTHER_PARAMETER';
  expect(()=>assertIdentityPayloadR478(plan)).toThrow(kind.startsWith('contract')?'PARAMETER_CONTRACT:':'PARAMETER_SEMANTIC_KEY:');
  const transport=identityBoundaryTransportR478();
  await expect(preflightIdentityBoundaryR478(transport.client,[plan])).rejects.toThrow('STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES:');
  expect(transport.query).not.toHaveBeenCalled();
 });
 test.each(['scs','acs'] as const)('native host identity cannot be replaced or widened: %s',family=>{
  for(const kind of ['hostContract','capturedContract','oneOldContract','oneOldSemantic'] as const){
   const s=nativeScopeConfigSetupR460(family);let host=s.host;
   if(kind==='hostContract')host={...host,contract:'HOSTILE_NONEMPTY_HOST_CONTRACT'};
   if(kind==='capturedContract')s.c.definition.source_metadata.contract='HOSTILE_NONEMPTY_CAPTURE_CONTRACT';
   if(kind==='oneOldContract')s.captured.parameters[0]!.truth_metadata.contract='HOSTILE_NONEMPTY_SINGLE_OLD_CONTRACT';
   if(kind==='oneOldSemantic')s.captured.parameters[0]!.truth_metadata.semantic_parameter_key='HOSTILE_NONEMPTY_OLD_KEY';
   expect(()=>s.make({hostConfig:host,capturedParentDefinition:s.captured,mode:s.mode,newSourcePaths:[],verifyCurrentScopeCore:s.core}))
    .toThrow(kind==='oneOldSemantic'?'WHOLE_SCOPE_NATIVE_PARAMETER_IDENTITY_REQUIRED':'CURRENT_SCOPE_NATIVE_PUBLICATION_CONTRACT_REQUIRED');
  }
 });
});
