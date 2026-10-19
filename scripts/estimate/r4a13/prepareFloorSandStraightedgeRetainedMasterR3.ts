// WORK R3: real existing-Master descriptor. No on-import I/O, writer, process or DB client.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {appendFloorSandSmallRoomStraightedgeR1,floorSandStraightedgePackR1 as pack,
 floorSandStraightedgeSyntheticFactsR1} from '../../../src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1';
import {floorSandThicknessControlSyntheticFactsR1} from '../../../src/lib/estimate/v4/floorSandThicknessControlSpKr65R1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {floorSandUnderlayerAcceptanceInputR1} from './prepareFloorSandUnderlayerColumn01AppendR1';
import {canonicalDerivedQuantityEditPolicyV1} from '../../../src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1';
import {canonicalPublisherPriceBindingIsCompatible} from './canonicalDefinitionPublisherR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
 resolveMasterSingleDefinitionBindingApplicabilityByRowId,validateIndependentCompletenessMapReferences,
 type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,any>;
export type FloorStraightedgePinR3=Readonly<{path:string;sha256:string}>;
export const floorStraightedgeContractR3='gox-build.floor-sand-small-room-straightedge-retained/r3';
export const floorStraightedgeParentR3={definitionId:'40564b81-048b-5182-9e68-d9a38c53f334',baselineId:'bca3280c-7cb3-5a55-99dc-c0e7729b2f16',version:2} as const;
export const floorStraightedgeParameterIdsR3=[
 'floor_sand_straightedge_option','floor_sand_straightedge_scope','floor_sand_straightedge_room_reference',
 'floor_sand_straightedge_room_area_m2','floor_sand_straightedge_method','floor_sand_straightedge_plan_reference',
 'floor_sand_straightedge_visual_reference','floor_sand_straightedge_visual_coverage','floor_sand_straightedge_planned_measurement_count',
 'floor_sand_straightedge_payment_scope','floor_sand_straightedge_performed_measurement_count','floor_sand_straightedge_observed_maximum_gap_mm',
 'floor_sand_straightedge_journal_reference','floor_sand_straightedge_device_reference'] as const;
const sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const valueSha=(v:unknown)=>sha(JSON.stringify(stable(JSON.parse(JSON.stringify(v)))));
const HASH=/^[0-9a-f]{64}$/u,HEAD=/^[0-9a-f]{40}$/u,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const oldNeedIds=['external-delivery-unloading','extra-mobilization','quality-control','protection-tools','cleanup-waste'].map(s=>'floor-underlayer:sand:krer11-01-002-01:open:'+s);
/** Identity only: exact existing Master's private uuid bits, fed by its exported hash.
 * No formula/quantity/release calculator. Registry seeds match Master1313/1315. */
function registryUuid(seed:string):string{
 const bytes=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');
 bytes[6]=(bytes[6]!&0x0f)|0x50;bytes[8]=(bytes[8]!&0x3f)|0x80;const h=bytes.toString('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/** Fourteen explicit object-fact constraints, NOT proof that any observation occurred. */
export function floorStraightedgeNewParameterSourcesR3():MasterRetainParentBindingsR1['newParameterSources']{
 return Object.fromEntries(floorStraightedgeParameterIdsR3.map(id=>[id,{kind:'KNOWN' as const,sourceIds:[pack.sourceIdProposal]}]));
}
export function floorStraightedgeRegistryDescriptorR3(){
 const sourceMetadata={source_title:'СП КР 65-101:2025: просвет под двухметровой рейкой нежёсткого песчаного подстилающего слоя пола',
  source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_INFORMATIONAL_STRAIGHTEDGE_CONSTRAINT_NOT_PAID',
  official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.exactLocatorRu,
  use_restriction:'Только отдельно измеренное одно помещение 0<A≤50 м² и один нежёсткий песчаный подстилающий слой под полы. Не менее 5 базовых измерений и все проектные/визуальные точки по явному плану; просвет под 2 м рейкой не более 15 мм. Объектные наблюдения — заявленные пользователем факты полного журнала. Не плотность, толщина, уклон, выполненная услуга, оплата или приёмка.'};
 const locator={key:'SPKR65-101-2025-T8-5-FLOOR-SAND-SMALL-ROOM-STRAIGHTEDGE',payload:{
  kind:'EXACT_OFFICIAL_NONRIGID_FLOOR_STRAIGHTEDGE_SMALL_SINGLE_ROOM_CONSTRAINT',normId:pack.normId,
  sourceArtifact:pack.source.path,sourceArtifactSha256:pack.source.sha256,pdfPages:[150,151],printedPages:[54,55],table:'8.5',
  exactLocatorRu:pack.source.exactLocatorRu,sourceFacts:clone(pack.sourceFacts),boundedDesign:clone(pack.boundedDesign),
  sourceNormativeBindingRowIds:[pack.rows.minimumCount,pack.rows.excess],
  unboundObservationRowId:pack.rows.recordedMaximum,constraintsNotObservationEvidence:true,minimumNotActualPerformed:true,
  newPaidOwners:0,newProcurementOwners:0,umbrellaQcNeedRowId:pack.completionNeedRowId,umbrellaQcNeedRemainsOpen:true,fullTechnicalAcceptance:false}};
 const binding={rowId:pack.rows.minimumCount,additionalRowIds:[pack.rows.excess],applicability:{constraintOnly:true}};
 const sourceId=registryUuid(`${floorStraightedgeContractR3}:${pack.sourceIdProposal}:source`);
 const locatorId=registryUuid(`${floorStraightedgeContractR3}:${pack.sourceIdProposal}:${locator.key}:locator`);
 const managedSource={id:sourceId,source_key:pack.sourceIdProposal,title_ru:sourceMetadata.source_title,authority:sourceMetadata.source_authority,
  official_url:sourceMetadata.official_url,artifact_sha256:sourceMetadata.artifact_sha256,effective_from:null,effective_to:null,
  metadata:{contract:floorStraightedgeContractR3,sourceKind:sourceMetadata.source_kind,useRestriction:sourceMetadata.use_restriction,
   universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}};
 const managedLocators=[{id:locatorId,source_id:sourceId,locator_key:locator.key,locator:clone(locator.payload),
  excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode:'FLOOR_STRAIGHTEDGE_RETAINED_R3',binding,locator,sourceMetadata})}];
 return{sourceMetadata,locator,managedSource,managedLocators,scope:{artifactSha256:pack.source.sha256,normId:pack.normId,sourceKey:pack.sourceIdProposal,
  generatedSourceId:sourceId,generatedLocatorIds:[locatorId],generatedLocatorKeys:[locator.key]}};
}
export type FloorStraightedgeDraftInputR3=Readonly<{capturedParent:MasterRetainedParentCaptureR1;capturedParentSha256:string;parentPassport:Json;parentPriceBindings:readonly Json[]}>;
/** Pure draft needs actual full captured arrays. Historical fixture is allowed only in
 * prospective pure tests; this function never produces a publication admission. */
export function prepareFloorStraightedgeRetainedDraftR3(input:FloorStraightedgeDraftInputR3){
 assert(object(input)&&object(input.capturedParent),'FLOOR_STRAIGHTEDGE_EXPLICIT_FULL_CAPTURE_REQUIRED');
 const c=clone(input.capturedParent),p=clone(input.parentPassport);
 assert(HASH.test(input.capturedParentSha256));assert.equal(masterRetainedParentCaptureSha256R1(c),input.capturedParentSha256,'FLOOR_STRAIGHTEDGE_PARENT_HASH');
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length],[29,28,28,13,2,2],'FLOOR_STRAIGHTEDGE_PARENT_29_28_28_NOT31');
 assert.equal(c.definition.id,floorStraightedgeParentR3.definitionId);assert.equal(c.baseline.id,floorStraightedgeParentR3.baselineId);assert.equal(Number(c.definition.definition_version),2);assert.equal(c.definition.catalog_id,pack.catalogId);assert.equal(c.baseline.catalog_id,pack.catalogId);
 assert.equal(c.baseline.definition_version_id,c.definition.id);assert.equal(p.definition_version_id,c.definition.id);assert.equal(p.catalog_id,pack.catalogId);
 assert.deepEqual([p.parameter_count,p.formula_count,p.resource_count],[29,28,28]);
 assert(object(c.definition.source_metadata.retainedParentBindingSuccessorV1));assert(!Object.hasOwn(c.definition.source_metadata,'retainedParentBindingContinuationV1'),'FLOOR_STRAIGHTEDGE_ONE_CONTINUATION_ONLY');
 assert.deepEqual(Object.keys(c.baseline.normative_source_ids).sort(),c.parameters.map(q=>q.parameter_id).sort());
 assert(c.normativeSources.every(s=>s.source_key!==pack.sourceIdProposal));
 assert(c.normativeSources.some(s=>s.source_key===pack.registry.existingParentSourceKey));
 assert.deepEqual(p.decision.unresolvedResourceRowIds.slice().sort(),oldNeedIds.slice().sort());
 assert(Array.isArray(input.parentPriceBindings)&&input.parentPriceBindings.length===0,'FLOOR_STRAIGHTEDGE_CURRENT_EXACT_ZERO_OLD_PRICE_ROWS_REQUIRED');
 const parent={parameters:c.parameters,formulas:c.formulas,resources:c.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
  ordinaryParameterIds:['floor_sand_net_volume_m3','floor_sand_thickness_control_option']} as unknown as AutomaticOwnerDefinition;
 const next=appendFloorSandSmallRoomStraightedgeR1(parent);
 assert.deepEqual([next.parameters.length,next.formulas.length,next.resources.length],[43,31,31]);
 assert.deepEqual(next.parameters.slice(0,29),c.parameters);assert.deepEqual(next.formulas.slice(0,28),c.formulas);assert.deepEqual(next.resources.slice(0,28),c.resources);
 const newParameterSources=floorStraightedgeNewParameterSourcesR3();assert.deepEqual(Object.keys(newParameterSources).sort(),next.parameters.slice(29).map(q=>q.parameter_id).sort());
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:input.capturedParentSha256,newParameterSources,
  capturedSourcePreimage:{sourceKey:pack.sourceIdProposal,expected:null},successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',
   capturedSourceMetadata:clone(c.definition.source_metadata),capturedSourceMetadataSha256:valueSha(c.definition.source_metadata),
   capturedPreviousSuccessorSha256:valueSha(c.definition.source_metadata.retainedParentBindingSuccessorV1)}};
 const applicabilityByRowId={
  [pack.rows.minimumCount]:{normId:pack.normId,sourceArtifactSha256:pack.source.sha256,exactTable:'СП КР 65-101:2025 табл. 8.5',
   sourceConstraint:'AT_LEAST_5_BASE_MEASUREMENTS_IN_ONE_SMALL_ROOM_PLUS_PROJECT_AND_VISUAL_POINTS',quantityBasis:'EXPLICIT_FULL_PLAN_INTEGER_GE5',
   printedAreaRangeM2:['50','70'],addressedRoomArea:'0<A<=50m2',noCeilOrAreaDivisor:true,notPerformedEvidence:true,paidNorm:false,umbrellaNeedRemainsOpen:true},
  [pack.rows.excess]:{normId:pack.normId,sourceArtifactSha256:pack.source.sha256,exactTable:'СП КР 65-101:2025 табл. 8.5',
   sourceConstraint:'MAXIMUM_GAP_UNDER_2000MM_STRAIGHTEDGE_15MM_NONRIGID_UNDERLAYER',quantityBasis:'MAX_0_DECLARED_COMPLETE_JOURNAL_MAX_GAP_MINUS15',
   projectDeclaredObservationOnly:true,notPerformedEvidence:true,notAutomaticAcceptance:true,paidNorm:false,umbrellaNeedRemainsOpen:true}};
 const binding={rowId:pack.rows.minimumCount,additionalRowIds:[pack.rows.excess],applicability:{informationalControlConstraintOnly:true,fullTechnicalAcceptance:false},applicabilityByRowId,retainParentBindings:retained};
 const map=clone(p.decision.independentCompletenessMap),oldMap=clone(map);assert(Array.isArray(map.entries)&&map.entries.length===16,'FLOOR_STRAIGHTEDGE_CAPTURED_MAP16_REQUIRED');
 const oldMapSha=valueSha(oldMap);map.previousStraightedgeMapOrigin={mapSha256:oldMapSha,capturedParentSha256:input.capturedParentSha256};
 map.evidenceReferences=[...map.evidenceReferences,pack.source.officialUrl,pack.source.path];
 // These three technology entries are declared from the source/observation scope,
 // not inferred by enumerating current rows; only resourcePlan31 enumerates rows.
 const entry=(rowId:string,formulaSuffix:string,unitId:string,quantityRule:string,sourceId:string,condition:string)=>({
  expectedResourceId:floorStraightedgeContractR3+':'+rowId,operationId:'floor-sand-single-small-room-straightedge-information',
  sourceId,condition,category:'work',unitId,quantityRule,formulaId:pack.prefix+':formula:'+formulaSuffix,resolution:{kind:'ROW',rowId}});
 const newEntries=[
  entry(pack.rows.minimumCount,'minimum-base-measurements','test','EXPLICIT_PLAN_COUNT_GE5_NOT_ACTUAL',pack.sourceIdProposal,'SINGLE_SMALL_ROOM_FULL_EXPLICIT_PLAN'),
  entry(pack.rows.recordedMaximum,'recorded-maximum-gap-mm','mm','DECLARED_COMPLETE_JOURNAL_MAX_GAP_MM','PROJECT_DECLARED_COMPLETE_JOURNAL','SINGLE_SMALL_ROOM_FULL_RECORDED_PLAN_AND_JOURNAL'),
  entry(pack.rows.excess,'recorded-excess-over-gap-limit-mm','mm','MAX_0_DECLARED_MAX_GAP_MM_MINUS15_NOT_ACCEPTANCE',pack.sourceIdProposal,'SINGLE_SMALL_ROOM_FULL_RECORDED_PLAN_AND_JOURNAL')];
 map.evidenceSha256=pack.source.sha256;map.entries.push(...newEntries);
 assert.deepEqual(map.entries.slice(0,16),oldMap.entries);assert.equal(map.entries.length,19);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
 const resourcePlan31=next.resources.map((r,i)=>({rowId:r.row_id,formulaId:r.formula_id,unitId:r.unit_id,
  mode:i<28?'PRESERVE_FULL_OLD_RESOURCE_FORMULA_PAYMENT_PROVENANCE':'NEW_INFORMATIONAL_NO_PRICE_INHERITANCE',
  normativeBindingMode:i<28?'PRESERVE_EXACT_OLD_BINDING_SET':r.row_id===pack.rows.recordedMaximum?'UNBOUND_DECLARED_OBSERVATION':'NEW_CONSTRAINT_ONLY_BINDING',
  genericPriceInheritanceAllowed:i<28?'PRESERVE_OLD_POLICY':false}));assert.equal(new Set(resourcePlan31.map(r=>r.rowId)).size,31);
 const verifyCore=async()=>{
  assert.deepEqual(next.parameters.slice(0,29),c.parameters);assert.deepEqual(next.formulas.slice(0,28),c.formulas);assert.deepEqual(next.resources.slice(0,28),c.resources);
  const resolved=resolveMasterSingleDefinitionBindingApplicabilityByRowId({binding},next.resources,['PURE_ONLY_NOT_A_PUBLISHED_LOCATOR']);
  assert.deepEqual(Object.keys(resolved).sort(),[pack.rows.minimumCount,pack.rows.excess].sort());assert.deepEqual(resolved,applicabilityByRowId);
  for(const r of next.resources.slice(28)){
   assert.equal(r.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(r.procurement_eligible,false);assert.equal(r.source_metadata?.automaticGenericPriceInheritanceAllowed,false);
   assert.equal(canonicalDerivedQuantityEditPolicyV1(r.resource_graph.derivedQuantityEditPolicyV1)?.mode,'PARAMETERS_ONLY');
   assert.equal(canonicalPublisherPriceBindingIsCompatible({sourceResource:r,targetResource:r,sourceBindingPriceKey:r.cost_owner_id}),false,'FLOOR_STRAIGHTEDGE_EXPLICIT_PRICE_INHERITANCE_BAN');
  }
  const registry=floorStraightedgeRegistryDescriptorR3();
  const representative=prepareMasterRetainedBindingRepresentativeR1({config:{stopCode:'FLOOR_STRAIGHTEDGE_RETAINED_R3',catalogId:pack.catalogId,parentReleaseId:c.definition.release_id,binding},
   newSource:registry.managedSource,newLocators:registry.managedLocators},{parameters:next.parameters,formulas:next.formulas,resources:next.resources,
   newBindings:Object.entries(applicabilityByRowId).map(([row_id,applicability])=>({row_id,locator_id:registry.managedLocators[0]!.id,applicability})),
   successorProvenance:{contract:floorStraightedgeContractR3,sourceId:pack.sourceIdProposal,normId:pack.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:input.capturedParentSha256}});
  assert.equal(representative.expectedNormativeBindingCount,15);
  for(const q of c.parameters)assert.deepEqual(representative.normativeSourceIds[q.parameter_id],c.baseline.normative_source_ids[q.parameter_id]);
  for(const id of floorStraightedgeParameterIdsR3)assert.deepEqual(representative.normativeSourceIds[id],[pack.sourceIdProposal]);
  assert.deepEqual(representative.sourceMetadata.retainedParentBindingSuccessorV1,c.definition.source_metadata.retainedParentBindingSuccessorV1);
  assert.deepEqual(representative.sourceMetadata.retainedParentBindingContinuationV1.previousSourceMetadata,c.definition.source_metadata);
  const recordedMaximum=next.resources.find(r=>r.row_id===pack.rows.recordedMaximum);
  assert(recordedMaximum&&object(recordedMaximum.source_metadata),'FLOOR_STRAIGHTEDGE_RECORDED_METADATA_REQUIRED');
  assert.deepEqual(recordedMaximum.source_metadata.normativeTrace,[]);
  assert.deepEqual(next.resources.find(r=>r.row_id===pack.completionNeedRowId),c.resources.find(r=>r.row_id===pack.completionNeedRowId));
  return{status:'PASS_FLOOR_STRAIGHTEDGE_RETAIN13_ADD2_PURE_FACTORY_ONLY',shape:[43,31,31],retainedShape:[29,28,28],oldBindings:13,newBindings:2,bindings:15,
   newParameterSources:14,oldSourceArrays:29,newInfoRows:3,newPaidOwners:0,newProcurementOwners:0,newPriceBindings:0,oldPriceBindingRows:input.parentPriceBindings.length,
   staticNeeds:5,independentMapEntries:19,resourcePlanRows:31,fullTechnicalAcceptance:false,publicationPerformed:false};
 };
 return{capture:c,parentPassport:p,next,binding,newParameterSources,completenessMap:map,resourcePlan31,oldMapSha,verifyCore};
}

/** No aliases/fallbacks: ROOT emits this binding only after the actual fresh owned read.
 * Proposed status is an authoring schema, not a claim that such proof exists today. */
export const floorStraightedgeRootBindingStatusR3='ROOT_VERIFIED_CURRENT_FLOOR_STRAIGHTEDGE_RETAINED_AND_SCOPED_INPUTS_R3';
const sharedPaths=[
 'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
 'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
 'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
 'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'] as const;
export type FloorStraightedgeRootBindingR3=Readonly<{
 status:typeof floorStraightedgeRootBindingStatusR3;contract:typeof floorStraightedgeContractR3;
 executionContext:Readonly<{sourceHead:string;recordedReleaseSourceCommit:string;definitionReleaseId:string;searchReleaseId:string}>;
 sourceTree:string;currentPointerPin:FloorStraightedgePinR3;rootDecisionPin:FloorStraightedgePinR3;
 freshParentCapturePin:FloorStraightedgePinR3;closedCaptureGuardPin:FloorStraightedgePinR3;freshScopedCapturePin:FloorStraightedgePinR3;
 sharedSourcePins:readonly FloorStraightedgePinR3[];masterPath:string;masterSha256:string;
 actualQueryHead:string;readOnly:boolean;allTransactionsRolledBack:boolean;allConnectionsClosed:boolean;databaseWritesPerformed:boolean;
 freshParentBodySha256:string;freshScopedCaptureValueSha256:string;
 parent:FloorStraightedgeDraftInputR3;capturedScopedNormativeRegistry:MasterCapturedScopedNormativeRegistryR1;
 capturedSearchPrimaryUom:string;evidenceSha256:string;automaticRebaseAllowed:false;
}>;
function readExactPin(p:FloorStraightedgePinR3):Uint8Array{
 assert(object(p)&&HASH.test(p.sha256)&&typeof p.path==='string','FLOOR_STRAIGHTEDGE_REQUIRED_EXACT_PIN');
 assert(!p.path.includes('\\')&&!p.path.split('/').includes('..')&&!p.path.includes(':')&&!p.path.startsWith('/'),'FLOOR_STRAIGHTEDGE_RELATIVE_CANONICAL_PIN_REQUIRED');
 const b=readFileSync(resolve(p.path));assert.equal(sha(b),p.sha256,'FLOOR_STRAIGHTEDGE_PIN_DRIFT:'+p.path);return b;
}
function readJsonPin(p:FloorStraightedgePinR3):Json{return JSON.parse(Buffer.from(readExactPin(p)).toString('utf8').replace(/^\uFEFF/u,''));}
/** Full descriptor for ROOT -> existing runMasterSingleDefinitionSuccessorR1.
 * No PG construction, queries, process, writes, UUID allocation for future release,
 * or automatic transition from the historical fixture to a current parent. */
export function prepareFloorSandStraightedgeRetainedMasterR3(input:Readonly<{rootBindingPin:FloorStraightedgePinR3;outputRoot?:string}>):MasterSingleDefinitionSuccessorConfig{
 assert(object(input)&&object(input.rootBindingPin),'FLOOR_STRAIGHTEDGE_FRESH_ROOT_BINDING_REQUIRED');
 const b=readJsonPin(input.rootBindingPin) as FloorStraightedgeRootBindingR3;
 assert.equal(b.status,floorStraightedgeRootBindingStatusR3);assert.equal(b.contract,floorStraightedgeContractR3);assert.equal(b.automaticRebaseAllowed,false);
 const x=b.executionContext;assert(object(x));assert.deepEqual(Object.keys(x).sort(),['sourceHead','recordedReleaseSourceCommit','definitionReleaseId','searchReleaseId'].sort());
 assert(HEAD.test(x.sourceHead)&&HEAD.test(x.recordedReleaseSourceCommit)&&HEAD.test(b.sourceTree));assert(UUID.test(x.definitionReleaseId)&&UUID.test(x.searchReleaseId));
 assert.equal(b.actualQueryHead,x.sourceHead);assert.equal(b.readOnly,true);assert.equal(b.allTransactionsRolledBack,true);assert.equal(b.allConnectionsClosed,true);assert.equal(b.databaseWritesPerformed,false);
 assert(HASH.test(b.evidenceSha256)&&HASH.test(b.masterSha256));assert.equal(sha(readFileSync(b.masterPath)),b.masterSha256,'FLOOR_STRAIGHTEDGE_MASTER_BYTES');
 assert.equal(valueSha(b.parent),b.freshParentBodySha256,'FLOOR_STRAIGHTEDGE_PARENT_INPUT_BODY_SEAL');
 assert.equal(valueSha(b.capturedScopedNormativeRegistry),b.freshScopedCaptureValueSha256,'FLOOR_STRAIGHTEDGE_RAW_SCOPED_BODY_SEAL');
 assert.equal(b.currentPointerPin.path,'data/estimate-benchmarks/r568-local-developer-canonical-release.json');
 const pointer=readJsonPin(b.currentPointerPin);assert.equal(pointer.definitionReleaseId,x.definitionReleaseId);assert.equal(pointer.searchReleaseId,x.searchReleaseId);
 const decision=readJsonPin(b.rootDecisionPin);
 assert.equal(decision.contract,floorStraightedgeContractR3);assert.equal(decision.preparationOnly,false);assert.equal(decision.publicationDesignAdmitted,true);
 assert.equal(decision.freshParentCaptureSha256,b.freshParentCapturePin.sha256);assert.equal(decision.scopedCaptureSha256,b.freshScopedCapturePin.sha256);
 assert.equal(decision.capturedParentSha256,b.parent.capturedParentSha256);assert.equal(decision.sourceKey,pack.sourceIdProposal);assert.equal(decision.normId,pack.normId);
 assert.equal(decision.strictSourceAbsenceRequired,true);assert.equal(decision.sameArtifactNormalLockedRegisteredPredicateRequired,true);
 assert.equal(decision.singlePositiveRoomAtMost50M2Only,true);assert.equal(decision.fullTechnicalAcceptance,false);assert.equal(decision.originalFiveNeedsRemainOpen,true);
 assert.equal(decision.oldWholeLabourMachinesAndPriceRowsPreserved,true);assert.equal(decision.noNewInfoPriceInheritance,true);
 // Byte-pin ROOT's fresh artifacts. Deliberately no field-name guessing for the
 // underlying capture wrappers: ROOT binds their exact mapped bodies by these hashes.
 readExactPin(b.freshParentCapturePin);readExactPin(b.freshScopedCapturePin);
 const guard=readJsonPin(b.closedCaptureGuardPin);assert(typeof guard.status==='string'&&guard.status.startsWith('PASS_'));
 assert.equal(guard.error,null);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);
 assert(Array.isArray(b.sharedSourcePins)&&b.sharedSourcePins.length===sharedPaths.length);
 assert.deepEqual(b.sharedSourcePins.map(p=>p.path).sort(),sharedPaths.slice().sort());for(const p of b.sharedSourcePins)readExactPin(p);
 const d=prepareFloorStraightedgeRetainedDraftR3(b.parent),r=floorStraightedgeRegistryDescriptorR3(),c=d.capture,p=d.parentPassport;
 assert.equal(b.capturedScopedNormativeRegistry?.captureSha256?.length,64,'FLOOR_STRAIGHTEDGE_FRESH_RAW_SCOPED_CAPTURE_REQUIRED');
 assert.deepEqual(b.capturedScopedNormativeRegistry.scope,r.scope,'FLOOR_STRAIGHTEDGE_EXACT_SCOPE');
 // Use the real R2 helper now, not an alternate local validator. It rejects stale
 // hashes, target collisions, same-norm collisions, bad raw projection and cap overflow.
 assert(resolveMasterScopedNormativeRegistryOptInR1({config:{stopCode:'FLOOR_STRAIGHTEDGE_RETAINED_R3',normId:pack.normId,
  capturedScopedNormativeRegistry:b.capturedScopedNormativeRegistry,binding:{retainParentBindings:d.binding.retainParentBindings}},newSource:r.managedSource,newLocators:r.managedLocators}));
 assert(typeof b.capturedSearchPrimaryUom==='string'&&b.capturedSearchPrimaryUom.length>0,'FLOOR_STRAIGHTEDGE_CURRENT_SEARCH_UOM_REQUIRED');
 const proofPaths=[input.rootBindingPin.path,b.rootDecisionPin.path,b.freshParentCapturePin.path,b.closedCaptureGuardPin.path,b.freshScopedCapturePin.path];
 const sourcePaths=[...sharedPaths,'scripts/estimate/r4a13/prepareFloorSandStraightedgeRetainedMasterR3.ts',
  'scripts/estimate/r4a13/prepareFloorSandUnderlayerColumn01AppendR1.ts','src/lib/estimate/v4/floorSandSmallRoomStraightedgeControlR1.ts',
  'src/lib/estimate/v4/floorSandThicknessControlSpKr65R1.ts','src/lib/estimate/v4/floorSandUnderlayerKrer11Column01R1.ts',
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/estimateDeterministicHash.ts',
  'src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts','src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1.ts',
  'data/estimate-benchmarks/source-packs/floor-sand-small-room-straightedge-spkr65-r1.json',
  'data/estimate-benchmarks/source-packs/floor-sand-thickness-control-spkr65-101-r1.json',
  'data/estimate-benchmarks/source-packs/floor-sand-underlayer-krer11-002-01-r1.json',pack.source.path,...proofPaths];
 assert.equal(new Set(sourcePaths).size,sourcePaths.length,'FLOOR_STRAIGHTEDGE_SOURCE_PATH_COLLISION');
 assert(!sourcePaths.includes(b.currentPointerPin.path),'FLOOR_STRAIGHTEDGE_MUTABLE_POINTER_NOT_SOURCE_PIN');
 return{contract:floorStraightedgeContractR3,stopCode:'FLOOR_STRAIGHTEDGE_RETAINED_R3',applicationName:'floor-sand-straightedge-retained-r3',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:b.masterPath,masterSha256:b.masterSha256,parentReleaseId:x.definitionReleaseId,parentSearchReleaseId:x.searchReleaseId,
  currentReleasePath:b.currentPointerPin.path,outputRoot:input.outputRoot??'.release-runtime/next-wave/floor-sand-straightedge/publication',sourcePaths,
  catalogId:pack.catalogId,sourceId:pack.sourceIdProposal,normId:pack.normId,sourceMetadata:r.sourceMetadata,capturedScopedNormativeRegistry:b.capturedScopedNormativeRegistry,
  parameterDefinitions:d.next.parameters,formulaDefinitions:d.next.formulas,resourceDefinitions:d.next.resources,expectedParentShape:[29,28,28],benchmarkOrdinal:0,
  shortInput:{floor_sand_net_volume_m3:10},acceptanceInput:{...floorSandUnderlayerAcceptanceInputR1,floor_sand_net_volume_m3:10,
   ...floorSandThicknessControlSyntheticFactsR1('40','100'),...floorSandStraightedgeSyntheticFactsR1(true,'40','15')},
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  validationScenario:'EXACT_RETAIN29_28_28_ONE_ROOM40M2_PLAN5_RECORDED5_GAP15MM_INFORMATIONAL_ONLY_NOT_ACTUAL_SITE_EVIDENCE',
  passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:p.physical_result_ru,
   includedScopeRu:[...p.included_scope_ru,'Для одного измеренного помещения 0<A≤50 м²: явный план минимум 5 проверок и визуальных точек, справочный зарегистрированный просвет под 2 м рейкой и превышение над 15 мм.'],
   excludedScopeRu:[...p.excluded_scope_ru,'Не заменяет плотность, толщину, уклон, полный QC, выполнение или приёмку. Отдельная оплата рейки/труда/расходников не назначена; исходные пять потребностей остаются открыты.'],
   independentCompletenessMap:d.completenessMap,unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds},
  applicability:{...c.definition.applicability,straightedgeCompletionContract:pack.contract,singleSmallRoomAtMost50M2:true,
   sourceFactNotActualObservation:true,parentCaptureSha256:b.parent.capturedParentSha256,scopedRegistryCaptureSha256:b.capturedScopedNormativeRegistry.captureSha256,
   rootBindingSha256:input.rootBindingPin.sha256,evidenceSha256:b.evidenceSha256,oldWholeOperationAndFiveNeedsUnchanged:true,fullTechnicalAcceptance:false},
  binding:d.binding,locator:r.locator,
  search:{primaryUom:b.capturedSearchPrimaryUom,canonicalNameRu:c.definition.passport.canonicalRuName,
   aliases:['песчаный подстилающий слой под полы КРЕР 11-01-002-01','контроль просвета под двухметровой рейкой песчаного слоя одного малого помещения'],
   shortScopeRu:'Исходная песчаная подготовка и контроль толщины сохранены. Только информационный план/журнал ровности отдельного малого помещения; пять потребностей не закрыты.',
   keyDistinguishingParameters:['floor_sand_net_volume_m3',pack.selectionParameter,'floor_sand_straightedge_room_area_m2','floor_sand_straightedge_planned_measurement_count'],
   clarificationFields:d.next.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),
   includedBoundaries:p.included_scope_ru,excludedBoundaries:p.excluded_scope_ru,extraSearchTermsRu:'песчаный слой пола малая комната контрольная двухметровая рейка просвет 15 мм 5 измерений СП КР 65-101:2025',
   sourceProvenance:{contract:floorStraightedgeContractR3,retainedCaptureSha256:b.parent.capturedParentSha256,scopedRegistryCaptureSha256:b.capturedScopedNormativeRegistry.captureSha256,
    rootBindingSha256:input.rootBindingPin.sha256,oldBindings:13,newBindings:2,newPaidOwners:0,newPriceBindings:0,staticNeeds:5,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/road-upper|road-base:|gravel-base:|trench:|professional_.*_set|materials_0[1-6]/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'floor_sand_straightedge_retained_r3',
  verifyCore:async()=>({...await d.verifyCore(),freshRootBindingBytePinned:true,sourceHeadAtPreparation:x.sourceHead,scopedRegistryDeclarationValidated:true,
   parentContinuationRequested:true,rawNormalLockedRegisteredSharedGuardsStillRequired:true,publicationPerformed:false})};
}
