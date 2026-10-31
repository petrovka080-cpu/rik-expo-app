import {assertMasterIntegratedCuringRawOracleR145,type MasterIntegratedCuringRawOracleR145,createMasterAtomicRawReadR1,MASTER_WALL_NUMERIC_INVENTORY_R1,type MasterAtomicCollectionR1,type MasterFixedWallBaselineProfileR1} from './masterScopedNormativeRegistryPreimageR1';
import {masterExactVentilatedApprovedSparseBaselineR62} from './masterExactVentilatedApprovedSparseBaselineR62';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1';
import {resolveCanonicalSourceProfileSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1';
import {isMonolithicRepeatedContinuationCandidateR1,assertMonolithicRepeatedContinuationR1,MONOLITHIC_REPEAT_CONTINUATION_KEY_R1} from './monolithicRepeatedRetainedContinuationR1';
import {masterRegisteredRetainedForwardLineageR1 as registeredForwardLineage, isMasterRegisteredRetainedForwardDefinitionR1 as isRegisteredForwardDefinition} from "./masterRetainedForwardLineageR1";
// WORK PROPOSAL R2 ONLY; extends frozen R1 without editing it. No writer/API.
import { createHash } from "node:crypto";
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import { assertMasterSingleDefinitionCapturedSourcePreimageR1 } from
  "./masterSingleDefinitionAppendGuardsR1";
import type { Client } from "pg";
import { canonicalDefinitionPublicationStableValueR1 as stable } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1";

import { planCanonicalEffectiveResourceQuantitiesV1 } from
  "../../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1";
import { compileFormulaGraph } from
  "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { buildMasterParameterCalculationConsumers } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1";

import {assertMasterOperationCompositionDeclarationR1,assertMasterOperationCompositionComputationR1,
  masterOperationCompositionRepresentativeR1,assertMasterOperationCompositionPlanR1,
  type MasterOperationCompositionOnlyR1} from './masterOperationCompositionOnlyR1';
import {assertMasterMonolithicRepairGeometryVisibilityDeclarationR60,assertMasterMonolithicRepairGeometryVisibilityComputationR60,
  assertMasterMonolithicRepairGeometryVisibilityPlanR60,masterMonolithicRepairGeometryVisibilityCompactR60,
  type MasterMonolithicRepairGeometryVisibilityOnlyR60} from './masterMonolithicRepairGeometryVisibilityOnlyR60';
type Json = Record<string, any>;

// General explicit append within this same retained publisher guard.

type AppendJsonV1=Record<string,unknown>;
type AppendHeaderV1=Readonly<{definition:AppendJsonV1;baseline:AppendJsonV1}>;
export type MasterSuccessorProvenanceAppendV1=Readonly<{
  contract:'master-retained-binding-append/v1';
  capturedSourceMetadata:AppendJsonV1;
  capturedSourceMetadataSha256:string;
  capturedPreviousSuccessorSha256:string;
}>;
type AppendContextV1=Readonly<{capture:AppendHeaderV1;capturedParentSha256:string;catalogId:string;stopCode:string}>;
const KEY='retainedParentBindingLineageV1';
const CONTRACT='master-retained-binding-lineage/v1';
const LIFE=['contract','masterSha256','sourceFingerprint'] as const;
const PREFIX=['retainedParentBindingSuccessorV1','retainedParentBindingContinuationV1','retainedParentBindingContinuationV2'] as const;
export const MASTER_RETAINED_APPEND_LIMITS_V1=Object.freeze({entries:32,lineageBytes:65536,successorBytes:16384,sourceMetadataBytes:524288,depth:16,nodes:4096});
const record=(v:unknown):v is AppendJsonV1=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hashPattern=/^[0-9a-f]{64}$/u;
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512;
function check(value:unknown,c:AppendContextV1,code:string):asserts value{if(!value)throw Error('STOP_'+c.stopCode+'_RETAIN_APPEND_'+code);}
export const masterRetainedLineageValueSha256V1=(value:unknown):string=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
function keys(v:AppendJsonV1,expected:readonly string[]){return same(Object.keys(v).sort(),[...expected].sort());}
function json(c:AppendContextV1,value:unknown,byteCap:number,code:string,forbidHistory=false):void{
  let nodes=0;
  const visit=(v:unknown,depth:number):void=>{
    check(++nodes<=MASTER_RETAINED_APPEND_LIMITS_V1.nodes&&depth<=MASTER_RETAINED_APPEND_LIMITS_V1.depth,c,code);
    if(v===null||typeof v==='string'||typeof v==='boolean')return;
    if(typeof v==='number'){check(Number.isFinite(v),c,code);return;}
    check(Array.isArray(v)||record(v),c,code);
    if(Array.isArray(v)){for(const item of v)visit(item,depth+1);return;}
    for(const [key,item]of Object.entries(v)){
      check(!forbidHistory||![...PREFIX,KEY,'capturedSourceMetadata','previousSourceMetadata'].includes(key),c,code);
      visit(item,depth+1);
    }
  };
  visit(value,0);
  check(Buffer.byteLength(JSON.stringify(value))<=byteCap,c,code);
}
function successor(c:AppendContextV1,value:unknown):AppendJsonV1{
  check(record(value)&&text(value.parentDefinitionId)&&text(value.parentBaselineId)
    &&typeof value.capturedParentSha256==='string'&&hashPattern.test(value.capturedParentSha256)
    &&(!Object.hasOwn(value,'catalogId')||value.catalogId===c.catalogId),c,'SUCCESSOR_SHAPE');
  return value;
}
function legacyLatest(c:AppendContextV1,metadata:AppendJsonV1):AppendJsonV1{
  let latest=successor(c,metadata[PREFIX[0]]);
  for(let i=1;i<PREFIX.length;i++){
    const key=PREFIX[i]!;
    if(!Object.hasOwn(metadata,key)){check(i!==1||!Object.hasOwn(metadata,PREFIX[2]),c,'PREFIX_ORDER');continue;}
    const value=metadata[key];
    check(record(value)&&keys(value,['contract','previousSourceMetadata','previousSourceMetadataSha256','previousSuccessorSha256','successor'])
      &&value.contract==='master-retained-binding-continuation/r1'&&record(value.previousSourceMetadata),c,'PREFIX_SHAPE');
    const previous=value.previousSourceMetadata;
    check(!Object.hasOwn(previous,key)&&!Object.hasOwn(previous,KEY)
      &&masterRetainedLineageValueSha256V1(previous)===value.previousSourceMetadataSha256
      &&masterRetainedLineageValueSha256V1(latest)===value.previousSuccessorSha256,c,'PREFIX_HASH');
    for(let n=0;n<i;n++)check(same(previous[PREFIX[n]!],metadata[PREFIX[n]!]),c,'PREFIX_REWRITE');
    latest=successor(c,value.successor);
    check(latest.catalogId===c.catalogId,c,'PREFIX_CATALOG');
  }
  return latest;
}
function lifecycle(c:AppendContextV1,value:unknown):AppendJsonV1{
  check(record(value)&&Object.keys(value).every(k=>LIFE.includes(k as typeof LIFE[number]))
    &&Object.values(value).every(text),c,'LIFECYCLE_SHAPE');
  return value;
}
function withoutLifecycle(metadata:AppendJsonV1):AppendJsonV1{return Object.fromEntries(Object.entries(metadata).filter(([k])=>k!==KEY&&!LIFE.includes(k as typeof LIFE[number])));}
function parentEdge(c:AppendContextV1,latest:AppendJsonV1):void{
  const {definition,baseline}=c.capture;
  check(definition.catalog_id===c.catalogId&&baseline.catalog_id===c.catalogId&&baseline.definition_version_id===definition.id,c,'CURRENT_HEADER');
  check(baseline.source_definition_version_id===latest.parentDefinitionId&&baseline.supersedes_baseline_id===latest.parentBaselineId,c,'CURRENT_BASELINE_PREDECESSOR');
}
export type MasterRetainedAppendStateV1=Readonly<{metadata:AppendJsonV1;entries:readonly AppendJsonV1[];latest:AppendJsonV1}>;
/** Source/capture authority remains in the existing normal+locked full-parent
 * guard. This opt-in adds a bounded compact history, never another writer. */
export function validateMasterRetainedBindingAppendV1(c:AppendContextV1,optIn:unknown):MasterRetainedAppendStateV1{
  check(record(optIn)&&keys(optIn,['contract','capturedSourceMetadata','capturedSourceMetadataSha256','capturedPreviousSuccessorSha256'])
    &&optIn.contract==='master-retained-binding-append/v1',c,'OPT_IN_OBJECT');
  const metadata=c.capture.definition.source_metadata;
  json(c,metadata,MASTER_RETAINED_APPEND_LIMITS_V1.sourceMetadataBytes,'SOURCE_METADATA_BOUNDS');
  check(record(metadata)&&record(optIn.capturedSourceMetadata)
    &&same(metadata,optIn.capturedSourceMetadata)&&masterRetainedLineageValueSha256V1(metadata)===optIn.capturedSourceMetadataSha256
    &&typeof optIn.capturedSourceMetadataSha256==='string'&&hashPattern.test(optIn.capturedSourceMetadataSha256),c,'SOURCE_METADATA_DRIFT');
  let latest=legacyLatest(c,metadata);
  let entries:AppendJsonV1[]=[];
  if(Object.hasOwn(metadata,KEY)){
    const lineage=metadata[KEY];
    check(record(lineage)&&keys(lineage,['contract','entries'])&&lineage.contract===CONTRACT
      &&Array.isArray(lineage.entries)&&lineage.entries.length>0&&lineage.entries.length<=MASTER_RETAINED_APPEND_LIMITS_V1.entries,c,'LINEAGE_SHAPE');
    json(c,lineage,MASTER_RETAINED_APPEND_LIMITS_V1.lineageBytes,'LINEAGE_BOUNDS');
    check(lineage.entries.every(record),c,'ENTRY_SHAPE');entries=lineage.entries;
  }
  const seenDefinitions=new Set<unknown>(PREFIX.map(key=>metadata[key]).filter(record).map(v=>record(v.successor)?v.successor.parentDefinitionId:v.parentDefinitionId));
  const seenBaselines=new Set<unknown>(PREFIX.map(key=>metadata[key]).filter(record).map(v=>record(v.successor)?v.successor.parentBaselineId:v.parentBaselineId));
  const business=withoutLifecycle(metadata);
  for(let index=0;index<entries.length;index++){
    const entry=entries[index]!;
    check(keys(entry,['sequence','catalogId','parentDefinitionId','parentBaselineId','parentDefinitionSha256','capturedParentSha256',
      'parentSourceDefinitionId','parentSupersedesBaselineId','previousSourceMetadataSha256','previousSuccessorSha256','parentLifecycle','successor'])
      &&entry.sequence===index+1&&entry.catalogId===c.catalogId&&text(entry.parentDefinitionId)&&text(entry.parentBaselineId)
      &&typeof entry.parentDefinitionSha256==='string'&&hashPattern.test(entry.parentDefinitionSha256)
      &&typeof entry.capturedParentSha256==='string'&&hashPattern.test(entry.capturedParentSha256),c,'ENTRY_SHAPE');
    check(!seenDefinitions.has(entry.parentDefinitionId)&&!seenBaselines.has(entry.parentBaselineId),c,'ENTRY_CYCLE');
    check(entry.parentSourceDefinitionId===latest.parentDefinitionId&&entry.parentSupersedesBaselineId===latest.parentBaselineId
      &&entry.previousSuccessorSha256===masterRetainedLineageValueSha256V1(latest),c,'ENTRY_PREDECESSOR');
    const parentLife=lifecycle(c,entry.parentLifecycle);
    const prior={...business,...parentLife,...(index?{[KEY]:{contract:CONTRACT,entries:entries.slice(0,index)}}:{})};
    check(entry.previousSourceMetadataSha256===masterRetainedLineageValueSha256V1(prior),c,'ENTRY_SOURCE_METADATA_HASH');
    latest=successor(c,entry.successor);json(c,latest,MASTER_RETAINED_APPEND_LIMITS_V1.successorBytes,'SUCCESSOR_BOUNDS',true);
    check(latest.catalogId===c.catalogId&&latest.parentDefinitionId===entry.parentDefinitionId
      &&latest.parentBaselineId===entry.parentBaselineId&&latest.capturedParentSha256===entry.capturedParentSha256,c,'ENTRY_SUCCESSOR');
    seenDefinitions.add(entry.parentDefinitionId);seenBaselines.add(entry.parentBaselineId);
  }
  check(!seenDefinitions.has(c.capture.definition.id)&&!seenBaselines.has(c.capture.baseline.id),c,'CURRENT_CYCLE');
  parentEdge(c,latest);
  check(typeof optIn.capturedPreviousSuccessorSha256==='string'&&hashPattern.test(optIn.capturedPreviousSuccessorSha256)
    &&optIn.capturedPreviousSuccessorSha256===masterRetainedLineageValueSha256V1(latest),c,'PREVIOUS_SUCCESSOR_DRIFT');
  check(entries.length<MASTER_RETAINED_APPEND_LIMITS_V1.entries,c,'LINEAGE_ENTRY_CAP');
  return{metadata,entries,latest};
}
export function appendMasterRetainedBindingLineageV1(c:AppendContextV1,state:MasterRetainedAppendStateV1,next:unknown,nextLifecycle:unknown):AppendJsonV1{
  const value=successor(c,next),life=lifecycle(c,nextLifecycle);
  check(value.parentDefinitionId===c.capture.definition.id&&value.parentBaselineId===c.capture.baseline.id
    &&value.capturedParentSha256===c.capturedParentSha256,c,'CURRENT_PARENT_ANCHOR');
  const stored={...value,catalogId:c.catalogId};
  json(c,stored,MASTER_RETAINED_APPEND_LIMITS_V1.successorBytes,'SUCCESSOR_BOUNDS',true);
  const {definition,baseline}=c.capture;
  check(typeof definition.definition_sha256==='string'&&hashPattern.test(definition.definition_sha256),c,'CURRENT_DEFINITION_SHA');
  const entry={sequence:state.entries.length+1,catalogId:c.catalogId,parentDefinitionId:definition.id,parentBaselineId:baseline.id,
    parentDefinitionSha256:definition.definition_sha256,capturedParentSha256:c.capturedParentSha256,
    parentSourceDefinitionId:baseline.source_definition_version_id,parentSupersedesBaselineId:baseline.supersedes_baseline_id,
    previousSourceMetadataSha256:masterRetainedLineageValueSha256V1(state.metadata),previousSuccessorSha256:masterRetainedLineageValueSha256V1(state.latest),
    parentLifecycle:Object.fromEntries(LIFE.filter(key=>Object.hasOwn(state.metadata,key)).map(key=>[key,state.metadata[key]])),successor:stored};
  const lineage={contract:CONTRACT,entries:[...state.entries,entry]};
  json(c,lineage,MASTER_RETAINED_APPEND_LIMITS_V1.lineageBytes,'LINEAGE_BOUNDS');
  const result:unknown=JSON.parse(JSON.stringify({...state.metadata,...life,[KEY]:lineage}));
  check(record(result),c,'OUTPUT_OBJECT');
  return result;
}


export type MasterApprovedTemplateSourceEvidenceR1=Readonly<{
  contract:'master-retained-approved-template-source-evidence/v1';
  capturedSourceDefinition:Record<string,unknown>;
  capturedSourceDefinitionSha256:string;
}>;
/** Older approval generators stored their package fingerprint in the binding's
 * sourceTree field. Preserve that field and prove the exact source reference;
 * never equate it to an unrelated current definition Git tree. */
function approvedTemplateSourceEvidenceOf(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  approval=opt.legacyTemplateAssumptionSources?.approvedTemplatePredecessor?.capturedParent??opt.capturedParent,
):MasterApprovedTemplateSourceEvidenceR1|null{
  const legacy=opt.legacyTemplateAssumptionSources;
  if(!legacy||!Object.hasOwn(legacy,'approvedSourceEvidence'))return null;
  const e=legacy.approvedSourceEvidence;
  requireThat(record(e)&&keys(e,['contract','capturedSourceDefinition','capturedSourceDefinitionSha256'])
    &&e.contract==='master-retained-approved-template-source-evidence/v1'&&record(e.capturedSourceDefinition),input,'APPROVED_SOURCE_EVIDENCE_OBJECT');
  const row=e.capturedSourceDefinition;
  json(appendContext(input,opt),row,MASTER_RETAINED_APPEND_LIMITS_V1.sourceMetadataBytes,'APPROVED_SOURCE_EVIDENCE_BOUNDS');
  requireThat(typeof e.capturedSourceDefinitionSha256==='string'&&hashPattern.test(e.capturedSourceDefinitionSha256)
    &&masterRetainedLineageValueSha256V1(row)===e.capturedSourceDefinitionSha256,input,'APPROVED_SOURCE_EVIDENCE_SHA');
  requireThat(row.id===approval.baseline.source_definition_version_id&&row.catalog_id===input.config.catalogId
    &&typeof row.definition_sha256==='string'&&hashPattern.test(row.definition_sha256)
    &&record(row.source_metadata)&&approval.baseline.contract_version==='APPROVED_TEMPLATE_BASELINE_R54_V1'
    &&approval.baseline.catalog_id===input.config.catalogId&&approval.baseline.definition_version_id===approval.definition.id,
    input,'APPROVED_SOURCE_DEFINITION_ANCHOR');
  requireThat(Array.isArray(approval.baseline.proposal_source_refs)&&approval.baseline.proposal_source_refs.length>0
    &&approval.baseline.proposal_source_refs.length<=16&&approval.baseline.proposal_source_refs.every(record),input,'APPROVED_SOURCE_REFERENCE_LIST');
  return e;
}
function approvedSourceBindingMatches(approval:MasterRetainedParentCaptureR1,e:MasterApprovedTemplateSourceEvidenceR1,
  parameter:Record<string,unknown>,binding:Record<string,unknown>,parameterBaselineId:unknown=approval.baseline.id):boolean{
  const b=approval.baseline,row=e.capturedSourceDefinition;
  const provenance=record(parameter.truth_metadata)&&record(parameter.truth_metadata.provenance)?parameter.truth_metadata.provenance:null;
  const references:unknown[]=Array.isArray(b.proposal_source_refs)?b.proposal_source_refs:[];
  const matching=references.filter((ref):ref is Record<string,unknown>=>record(ref)
    &&keys(ref,['contract','sourceDefinitionVersionId','sourceDefinitionSha256','sourceFingerprint'])&&text(ref.contract)
    &&ref.sourceDefinitionVersionId===row.id&&ref.sourceDefinitionSha256===row.definition_sha256
    &&ref.sourceFingerprint===binding.sourceTree);
  return matching.length===1&&typeof binding.sourceTree==='string'&&hashPattern.test(binding.sourceTree)
    &&parameter.approved_template_baseline_id===parameterBaselineId&&provenance!==null
    &&provenance.approvedTemplateBaselineId===b.id&&provenance.sourceDefinitionVersionId===row.id
    &&provenance.sourceParameterSchemaId===b.parameter_schema_sha256
    &&provenance.acceptanceEvidenceSha256===b.acceptance_evidence_sha256
    &&binding.parameterSchemaSha256===b.parameter_schema_sha256
    &&binding.acceptanceEvidenceSha256===b.acceptance_evidence_sha256
    &&record(b.formula_consumer_ids)&&record(b.resource_consumer_row_ids)
    &&same(binding.formulaConsumerIds,b.formula_consumer_ids[String(parameter.parameter_id)])
    &&same(binding.resourceConsumerRowIds,b.resource_consumer_row_ids[String(parameter.parameter_id)]);
}

const MASTER_RETAINED_SPARSE_BASELINE_METADATA_R1='master-retained-sparse-baseline-metadata/v1';
export type MasterRetainedSparseBaselineModelR1=Readonly<{
  baseline:Json;parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[];
}>;
/** Metadata coverage only. This marker cannot approve a source, input value or
 * physical norm. The existing full-capture, source-closure, retained-plan and
 * normal/locked guards remain required. Never insert values for metadata keys. */
export function buildMasterRetainedSparseBaselineMetadataR1(
  model:MasterRetainedSparseBaselineModelR1,predecessorCaptureSha256:string,
):Json{
  const b=model.baseline,ids=model.parameters.map(p=>p.parameter_id);
  const valid=(v:unknown):void=>{if(!v)throw Error('STOP_MASTER_RETAIN_SPARSE_BASELINE_METADATA_SHAPE');};
  valid(typeof predecessorCaptureSha256==='string'&&hashPattern.test(predecessorCaptureSha256)
    &&b.contract_version==='APPROVED_TEMPLATE_BASELINE_R54_V1'
    &&typeof b.parameter_schema_sha256==='string'&&hashPattern.test(b.parameter_schema_sha256)
    &&ids.length>0&&ids.every(text)&&new Set(ids).size===ids.length);
  const metadataKeys=['input_classification','uom_by_parameter','formula_consumer_ids',
    'resource_consumer_row_ids','guide_provenance_ru'];
  valid(record(b.input_values)&&record(b.normative_source_ids)
    &&metadataKeys.every(k=>record(b[k])&&keys(b[k],ids)));
  const sourceIds=Object.keys(b.normative_source_ids),inputIds=Object.keys(b.input_values);
  valid(sourceIds.every(id=>ids.includes(id))
    &&inputIds.length>0&&inputIds.every(id=>sourceIds.includes(id))
    &&Object.values(b.normative_source_ids).every(v=>Array.isArray(v)
      &&v.every(text)&&new Set(v).size===v.length));
  const classes=['ASSUMPTION','NORMATIVE','DERIVED','FIXTURE_ONLY','VALIDATION_FIXTURE','TEST_ONLY','RUNTIME_STRUCTURAL_DEFAULT'];
  valid(model.parameters.every(p=>classes.includes(b.input_classification[p.parameter_id])
    &&b.uom_by_parameter[p.parameter_id]===p.unit_id&&typeof b.guide_provenance_ru[p.parameter_id]==='string'));
  const omitted=model.parameters.filter(p=>!Object.hasOwn(b.normative_source_ids,p.parameter_id));
  valid(omitted.every(p=>p.value_type==='text'&&p.unit_id===null&&p.required===false&&p.default_value===null
    &&!model.formulas.some(f=>Array.isArray(f.input_parameter_ids)&&f.input_parameter_ids.includes(p.parameter_id))));
  const consumers=buildMasterParameterCalculationConsumers(model);
  const sameConsumers=(actual:Json,expected:Record<string,string[]>):boolean=>ids.every(id=>
    Array.isArray(actual[id])&&actual[id].every(text)&&new Set(actual[id]).size===actual[id].length
    &&same([...actual[id]].sort(),[...expected[id]!].sort()));
  valid(sameConsumers(b.formula_consumer_ids,consumers.formulaConsumers)
    &&sameConsumers(b.resource_consumer_row_ids,consumers.resourceConsumers));
  // Compare the persisted semantic columns. DB identity/timestamps and capture
  // ordering are already bound by the existing full-parent capture guard.
  const parameterColumns=['parameter_id','ordinal','value_type','unit_id','title_ru','required',
    'default_value','constraints_json','truth_metadata'];
  return{contract:MASTER_RETAINED_SPARSE_BASELINE_METADATA_R1,predecessorCaptureSha256,
    parameterSchemaSha256:b.parameter_schema_sha256,
    parameterSemanticsSha256:masterRetainedLineageValueSha256V1(records(model.parameters.map(p=>
      Object.fromEntries(parameterColumns.map(k=>[k,p[k]]))))),
    inputValuesSha256:masterRetainedLineageValueSha256V1(b.input_values),
    inputClassificationSha256:masterRetainedLineageValueSha256V1(b.input_classification),
    normativeSourceArraysSha256:masterRetainedLineageValueSha256V1(b.normative_source_ids),
    unitsSha256:masterRetainedLineageValueSha256V1(b.uom_by_parameter),
    guidesSha256:masterRetainedLineageValueSha256V1(b.guide_provenance_ru),
    consumerBindingsSha256:masterRetainedLineageValueSha256V1({formula:b.formula_consumer_ids,resource:b.resource_consumer_row_ids}),
    omittedOptionalNullTextParameterIds:omitted.map(p=>p.parameter_id).sort(),noDefaultsInserted:true};
}
export function masterRetainedSparseBaselineMetadataMatchesR1(
  model:MasterRetainedSparseBaselineModelR1,predecessorCaptureSha256:string,
):boolean{
  try{
    const refs=model.baseline.proposal_source_refs;
    if(!Array.isArray(refs)||refs.length===0||refs.length>16||!refs.every(record))return false;
    const markers=refs.filter(r=>r.contract===MASTER_RETAINED_SPARSE_BASELINE_METADATA_R1);
    return markers.length===1&&same(markers[0],buildMasterRetainedSparseBaselineMetadataR1(model,predecessorCaptureSha256));
  }catch{return false;}
}
function approvedSparseBaselineMetadataMatchesR1(c:MasterRetainedParentCaptureR1,capturedSha256:string):boolean{
  try{
    const metadata=c.definition.source_metadata;
    if(!record(metadata))return false;
    const context={capture:c,capturedParentSha256:capturedSha256,catalogId:c.definition.catalog_id,stopCode:'SPARSE_BASELINE'};
    let latest=legacyLatest(context,metadata);
    if(Object.hasOwn(metadata,KEY)){
      const lineage=metadata[KEY];
      if(!record(lineage)||!keys(lineage,['contract','entries'])||lineage.contract!==CONTRACT
        ||!Array.isArray(lineage.entries)||lineage.entries.length===0
        ||lineage.entries.length>MASTER_RETAINED_APPEND_LIMITS_V1.entries)return false;
      const last=lineage.entries[lineage.entries.length-1];
      if(!record(last))return false;
      latest=successor(context,last.successor);
    }
    // This is the immediate predecessor of the captured baseline, not the
    // current capture hash (which would make the marker self-referential).
    if(latest.parentDefinitionId!==c.baseline.source_definition_version_id
      ||latest.parentBaselineId!==c.baseline.supersedes_baseline_id)return false;
    return masterRetainedSparseBaselineMetadataMatchesR1(c,String(latest.capturedParentSha256));
  }catch{return false;}
}

function approvedBaselineSourceKeysMatch(c:MasterRetainedParentCaptureR1,capturedSha256:string):boolean{
  if(Array.isArray(c.baseline.proposal_source_refs)&&c.baseline.proposal_source_refs.some((r:unknown)=>
    record(r)&&r.contract===MASTER_RETAINED_SPARSE_BASELINE_METADATA_R1))return approvedSparseBaselineMetadataMatchesR1(c,capturedSha256);
  if(masterExactVentilatedApprovedSparseBaselineR62(c,capturedSha256))return true;
  const b=c.baseline,ids=c.parameters.map(p=>p.parameter_id);
  if(!record(b.normative_source_ids)||!record(b.input_values)||!record(b.input_classification))return false;
  const sourceIds=Object.keys(b.normative_source_ids);
  if(!sourceIds.every(id=>ids.includes(id))||!keys(b.input_values,sourceIds)||!keys(b.input_classification,sourceIds))return false;
  // An inherited optional null text context was excluded from the approved
  // input baseline. It is not a quantity or an unresolved numerical norm.
  return c.parameters.filter(p=>!Object.hasOwn(b.normative_source_ids,p.parameter_id)).every(p=>
    p.value_type==='text'&&p.unit_id===null&&p.required===false&&p.default_value===null
    &&!c.formulas.some(f=>Array.isArray(f.input_parameter_ids)&&f.input_parameter_ids.includes(p.parameter_id)));
}

type QueryClient = Pick<Client, "query">;
export type MasterRetainedParentCaptureR1 = Readonly<{
  definition: Json; baseline: Json; parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[];
  bindings: readonly Json[]; normativeSources: readonly Json[]; normativeLocators: readonly Json[];
}>;
export type MasterExplicitParameterSourcesR1 = Readonly<Record<string, Readonly<{
  kind: "KNOWN" | "DERIVED" | "UNRESOLVED"; sourceIds: readonly string[];
}>>>;
/** Additive existing-consumer declaration inside the existing profile mode.
 * Full capture owns all source facts; only hashes/IDs enter compact lineage. */
export type MasterExistingSourceConsumerReuseV1=Readonly<{
  contract:'master-retained-existing-source-consumer-reuse/v1';profileSelectorValue:string;
  additionsBySha256:Readonly<Record<string,Readonly<{kind:'and';operands:readonly AppendJsonV1[]}>>>;
  resourceChanges:Readonly<Record<string,Readonly<{capturedInclusionSha256:string;afterInclusionSha256:string;
    additionSha256:string;existingBindingSha256:string;existingLocatorId:string}>>>;
  locatorGroups:Readonly<Record<string,Readonly<{existingSourceId:string;capturedSourceSha256:string;
    capturedLocatorSha256:string;capturedBoundRowIds:readonly string[]}>>>;
  truthChanges:Readonly<Record<string,Readonly<{kind:'EXISTING_MEASURED_GEOMETRY_VISIBILITY'|'EXISTING_DOCUMENT_AUTHORITY';
    capturedTruthMetadataSha256:string;afterTruthMetadataSha256:string;
    guideShortCorrection?:Readonly<{capturedShortRu:string;afterShortRu:string}>}>>>;
  resourceChangesSha256:string;additionsSha256:string;truthChangesSha256:string;
}>;
/** SOURCE-ONLY R24 PROTOTYPE; no live preflight/publication acceptance.
 * One auxiliary existing registry tuple, separate from the primary newSource.
 * Historical metadata and primary one-source guards are not rewritten. */
export type MasterAdditionalCapturedExistingRegistryV1=Readonly<{
 contract:'master-one-additional-captured-existing-registry/r1';capturedParentSha256:string;
 reuse:Readonly<Json>;consumerEmission:Readonly<{contract:string;sourceMetadata:Readonly<Json>}>;
 capturedRegistryTupleSha256:string;newParameterIds:readonly string[];
 rowLocatorIds:Readonly<Record<string,string>>;
 rowSourceWitnessByRowId:Readonly<Record<string,Readonly<{
  sourceMetadataSha256:string;formulaValueSha256:string;physicalPaymentValueSha256:string;
 }>>>;
}>;
export type MasterAdditionalCapturedExistingRegistrySnapshotV1=Readonly<{
 sources:readonly Json[];locators:readonly Json[];sourceRawRows:readonly string[];locatorRawRows:readonly string[];
 metadataRoundTrip:true;
}>;
/** Declares an immutable origin only. The existing publisher pointer and
 * normal/locked full membership/capture/registry reads establish active authority. */
export type MasterProjectScopeOriginCurrentMembershipV1=Readonly<{
  contract:'master-project-scope-origin-current-membership/r1';
  frozenOriginDefinitionReleaseId:string; frozenOriginSearchReleaseId:string;
  nativeCaptureSha256:string;
}>;
export type MasterProjectScopeMetadataOnlyV1=Readonly<{
  contract:'master-retained-project-scope-metadata-only/v1';
  capturedContentPassport:Json; capturedContentPassportSha256:string;
  newProjectParameterIds:readonly string[]; newProjectParametersSha256:string; resourceGraphChangesSha256:string;
  scopeOnly:true; sourceAdmission:false; engineeringAcceptance:false;
  originCurrentMembershipV1?:MasterProjectScopeOriginCurrentMembershipV1;
}>;
export type MasterRetainParentBindingsR1 = Readonly<{
  projectScopeMetadataOnlyV1?: MasterProjectScopeMetadataOnlyV1;
  additionalCapturedExistingRegistryV1?: MasterAdditionalCapturedExistingRegistryV1;
  capturedParent: MasterRetainedParentCaptureR1;
  capturedParentSha256: string;
  /** Exact metadata-only authority migration. No parameter, formula, resource,
   * binding, source or locator is introduced or numerically changed. */
  truthAuthorityOnlyV1?: Readonly<{
    contract:'master-retained-truth-authority-only/v1';
    capturedContentPassport:Json; capturedContentPassportSha256:string;
    changes:Readonly<Record<string,Readonly<{
      capturedTruthMetadata:Json; capturedTruthMetadataSha256:string;
      afterTruthMetadataSha256:string;
    }>>>;
    changesSha256:string;
    /** Explicit source-selection metadata only; does not change the baseline,
     * quantities, resources, approved content or actual project/PPR facts. */
    sourceProfileMetadataOnlyV1?: Readonly<{
      contract:'master-retained-source-profile-metadata-only/v1';
      existingSourceConsumerReuseV1?:MasterExistingSourceConsumerReuseV1;
      capturedApplicabilitySha256:string;
      sourceProfileSelectionMetadata:Json;sourceProfileSelectionMetadataSha256:string;
      selectorChange:Readonly<{capturedTruthMetadata:Json;capturedTruthMetadataSha256:string;afterTruthMetadataSha256:string}>;
      /** Bounded presentation of the existing source profile only. */
      inputPresentationOnlyV1?: Readonly<{
        contract:'master-retained-source-profile-input-presentation-only/v1';
        legacySelectorValue:string;
        changes:Readonly<Record<string,Readonly<{
          capturedTruthMetadata:Json;capturedTruthMetadataSha256:string;afterTruthMetadataSha256:string;
        }>>>;
        changesSha256:string;
      }>;
    }>;
  }>;
  /** Exact current two-card presentation correction; no new physical/source rows. */
  monolithicRepairGeometryVisibilityOnlyR60?: MasterMonolithicRepairGeometryVisibilityOnlyR60;
  operationCompositionOnly?: MasterOperationCompositionOnlyR1;
  /** Exact keys: ONLY newly declared parameter IDs, including unresolved []. */
  newParameterSources: MasterExplicitParameterSourcesR1;
  /** R555 template inputs are historical visible assumptions, not registered
   * physical norms. Preserve only the exact approved old input provenance. */
  legacyTemplateAssumptionSources?: Readonly<{
    contract: 'master-retained-legacy-template-assumptions/r1'; templateId: string;
    parameterSources: Readonly<Record<string,readonly string[]>>;
    approvedSourceEvidence?: MasterApprovedTemplateSourceEvidenceR1;
    /** Exact original capture, anchored by the already accepted successor slot.
     * A second successor keeps the original approval; it never re-approves it
     * against the newer baseline or turns it into a physical norm. */
    approvedTemplatePredecessor?: Readonly<{
      capturedParent: MasterRetainedParentCaptureR1; capturedParentSha256: string;
    }>;
  }>;
  /** Exact reviewed historical fixture/project provenance; never a physical norm.
   * It is retained only on the three frozen source-ownership parents below. */
  legacyCapturedFixtureSources?: Readonly<{
    contract: "master-retained-captured-fixture-provenance/r1";
    parameterSources: Readonly<Record<string,readonly string[]>>;
  }>;
  /** Explicit one-time second retained successor. Never rewrites the old slot. */
  successorProvenanceContinuation?: Readonly<{
    contract: "master-retained-binding-continuation/r1";
    capturedSourceMetadata: Json;
    capturedSourceMetadataSha256: string;
    capturedPreviousSuccessorSha256: string;
  }>;
  /** Explicit bounded append; immutable V1/V2 prefixes are never rewritten. */
  successorProvenanceAppendV1?: MasterSuccessorProvenanceAppendV1;
  /** Optional captured absence at normal and locked preflight. Omission preserves
   * the accepted absent-or-managed-exact registry behavior. Not registry reuse. */
  capturedSourcePreimage?: Readonly<{sourceKey: string; expected: null}>;
  /** Explicit successor-only text correction; captured AST, inputs and old rows stay immutable. */
  formulaExpressionRepairs?: Readonly<Record<string, Readonly<{
    capturedExpressionSource: string; correctedExpressionSource: string;
  }>>>;
}>;
export type MasterRetainedBindingGuardInputR1 = Readonly<{
  config: Readonly<{
    stopCode: string; catalogId: string; parentReleaseId: string; parentSearchReleaseId?: string; catalogAppend?: unknown; projectSourcePackagePath?: unknown;
    binding: Readonly<{ retainParentBindings?: MasterRetainParentBindingsR1; reuseExistingNormativeRegistry?: unknown }>;
  }>;
  /** Full managed source row: every DDL column EXCEPT server-created created_at. */
  newSource: Json;
  /** Exact complete locator rows (DDL has no generated timestamp). */
  newLocators: readonly Json[];
}>;
export type MasterRetainedBindingSnapshotR1 = Readonly<{
  additionalCapturedExistingRegistryV1?:MasterAdditionalCapturedExistingRegistrySnapshotV1;
  membership: readonly Json[]; capture: MasterRetainedParentCaptureR1;
  newSources: readonly Json[]; newLocators: readonly Json[]; contentPassport?: Json;
  retainedForwardLineage?: readonly Json[];
  legacyApprovedSourceDefinition?: Record<string,unknown>;
}>;
function fail(input: MasterRetainedBindingGuardInputR1, suffix: string): never {
  throw new Error(`STOP_${input.config.stopCode}_RETAIN_${suffix}`);
}
function requireThat(value: unknown, input: MasterRetainedBindingGuardInputR1,
  suffix: string): asserts value { if (!value) fail(input, suffix); }
function object(value: unknown): value is Json {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function normalized(value: unknown): any { return JSON.parse(JSON.stringify(value)); }
function encoded(value: unknown): string { return JSON.stringify(stable(normalized(value))); }
function same(left: unknown, right: unknown): boolean { return encoded(left) === encoded(right); }
function records(rows: readonly Json[]): Json[] {
  const cloned = [...rows].map(row => normalized(row));
  return cloned.map(value => ({value, key: encoded(value)})).sort((a, b) => {
    const x = a.key, y = b.key; return x < y ? -1 : x > y ? 1 : 0;
  }).map(entry => entry.value);
}
function setOf(values: readonly string[]): string[] { return [...new Set(values)].sort(); }
function exactKeys(value: Json, keys: readonly string[]): boolean {
  return same(Object.keys(value).sort(), [...keys].sort());
}
function captureValue(capture: MasterRetainedParentCaptureR1): Json {
  return { definition: capture.definition, baseline: capture.baseline,
    parameters: records(capture.parameters), formulas: records(capture.formulas), resources: records(capture.resources),
    bindings: records(capture.bindings), normativeSources: records(capture.normativeSources),
    normativeLocators: records(capture.normativeLocators) };
}
export function masterRetainedParentCaptureSha256R1(capture: MasterRetainedParentCaptureR1): string {
  return createHash("sha256").update(encoded(captureValue(capture))).digest("hex");
}
/** Preserve a parameter that was already retired and unused in the exact
 * captured parent. This cannot retire a live input or admit a new orphan. The
 * ordinary retained-parent preflight still verifies this capture against DB. */
export function isMasterRetainedRetiredUnusedParameterR1(
  retained: MasterRetainParentBindingsR1 | undefined, parameter: Json,
  next: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]}>,
): boolean {
  if (!retained || masterRetainedParentCaptureSha256R1(retained.capturedParent)
    !== retained.capturedParentSha256) return false;
  const capture = retained.capturedParent;
  const matches = capture.parameters.filter(p => p.parameter_id === parameter.parameter_id);
  if (matches.length !== 1) return false;
  const old = matches[0]!;
  const retired = (p: Json) => p.required === false && p.default_value === null
    && p.truth_metadata?.visibility_role === 'INTERNAL_ONLY'
    && p.truth_metadata?.retiredAggregateKitParameter === true;
  if (!retired(old) || !retired(parameter)) return false;
  const declaration = (p: Json) => Object.fromEntries(Object.entries(p).filter(([key]) =>
    !['id','definition_version_id','approved_template_baseline_id','created_at','updated_at','truth_metadata'].includes(key)));
  const truth = (p: Json) => Object.fromEntries(Object.entries(p.truth_metadata).filter(([key]) =>
    !['visible_when','semantic_parameter_key','formula_consumers','resource_branch_consumers'].includes(key)));
  if (!same(declaration(old), declaration(parameter)) || !same(truth(old), truth(parameter))) return false;
  const id = parameter.parameter_id;
  for (const model of [capture, next]) {
    const consumers = buildMasterParameterCalculationConsumers(model);
    if (consumers.formulaConsumers[id]?.length !== 0 || consumers.resourceConsumers[id]?.length !== 0) return false;
  }
  return true;
}
function valueSha256(value: unknown): string {
  return createHash("sha256").update(encoded(value)).digest("hex");
}
/** ROOT-reviewed metadata successor of two exact current captures. This is
 * data admission in the existing retained owner, never a family calculator. */
type MasterProjectScopeCurrentAnchorR1 = Readonly<{
  captureSha256:string; parentDefinitionReleaseId:string; parentSearchReleaseId:string;
  definitionId:string; definitionSha256:string; baselineId:string;
  capturedContentPassportSha256:string; newProjectParameterIds:readonly string[];
  newProjectParametersSha256:string; resourceGraphChangesSha256:string;
  representativeComputationSha256:string; cloneSemanticComputationSha256:string;
  baselineSemanticsSha256:string; originalDefinitionSourceMetadataSha256:string;
  exactGraphKeys:readonly string[];
}>;
const MASTER_PROJECT_SCOPE_CURRENT_ANCHORS_R1:Readonly<Record<string,MasterProjectScopeCurrentAnchorR1>> = {
  "canonical-work:expanded:low_voltage_system": {
    "captureSha256": "3090fe07d1487edaa2bb41b3dab87267f3da3c7717c3049cebf846b497dd9065",
    "parentDefinitionReleaseId": "2df79e8d-4012-5557-87c0-f36285f59f17",
    "parentSearchReleaseId": "9b042edf-ca06-50f6-969a-556e6d14547a",
    "definitionId": "cb5756cb-cb9d-5238-b415-9fb3913601ea",
    "definitionSha256": "0e464c9301721640a7eb7b8c1e59ba0a4c3f24000c510541b4736da44c6a855c",
    "baselineId": "260f981d-bdcb-5ad3-8a15-018731c44455",
    "capturedContentPassportSha256": "87b2563f7312f430a52944883d6507eef425f73ac78ee490aa0ebe0fc048ec4e",
    "newProjectParameterIds": [
      "lvs_copper_profile_record_r5",
      "lvs_route_whole_method_record_r5",
      "lvs_outlet_whole_method_record_r5",
      "lvs_panel_whole_method_record_r5",
      "lvs_marking_register_record_r5",
      "lvs_copper_acceptance_record_r5",
      "lvs_whole_operation_review_decision_r5"
    ],
    "newProjectParametersSha256": "a73b697c09deda678c3406ce230859c1827f2d58f082fbc04dd97c6482c36799",
    "resourceGraphChangesSha256": "e1a53862159228f04a9d11ffed72a7be8a87d9bfc870ec6f174f7d0709042420",
    "representativeComputationSha256": "30aa46616cd2029a8282c9a2eb38f1b3243c7e9b5f3f1e120096d1f7e89c2002",
    "cloneSemanticComputationSha256": "eddbcd3dda6830f2917acc80a1425f7cd56e42be0335b0a37a4ec1f7a6fd5190",
    "baselineSemanticsSha256": "66646a012921629bc2d78270860bdf1719db3a8d6221ab31825b5031ad4011a2",
    "originalDefinitionSourceMetadataSha256": "fb725d87aa0d12c6931c10e58b2c81290e156f2bc92445558e8ca9122f221fc3",
    "exactGraphKeys": [
      "operationCompositionV1",
      "inputParameterIds",
      "scopeRequirementV1",
      "sourceWholeObjectBoundaryR5"
    ]
  },
  "canonical-work:expanded:access_control_system": {
    "captureSha256": "2105da5b64ac3787265e216825329c5e515dfd930d675cbd1288fd0466299c60",
    "parentDefinitionReleaseId": "2df79e8d-4012-5557-87c0-f36285f59f17",
    "parentSearchReleaseId": "9b042edf-ca06-50f6-969a-556e6d14547a",
    "definitionId": "b6ba50d2-9a88-5173-888f-bb75f92d85b5",
    "definitionSha256": "0472bffdf0dee8d0c603c93c1735c3c59518e5a639072a243d86058bb630fc57",
    "baselineId": "f2aab897-30d8-5ea7-b662-c86daad9aea3",
    "capturedContentPassportSha256": "9b787af4489f9e48dd71bc6f27093ed3a0cbefa4441ce7fc4bd5d4efcde8fd92",
    "newProjectParameterIds": [
      "acs_reader_whole_method_record_r5",
      "acs_lock_whole_method_record_r5",
      "acs_psu_whole_method_record_r5",
      "acs_battery_whole_method_record_r5",
      "acs_cabling_whole_method_record_r5",
      "acs_commissioning_whole_method_record_r5",
      "acs_controller_compatibility_record_r5",
      "acs_whole_operation_review_decision_r5"
    ],
    "newProjectParametersSha256": "0accbd7812adbc5b4b2445caa6ac013094475ebb3e30bcede6ffa3c554b55328",
    "resourceGraphChangesSha256": "4907133b7255707178c3a8917f65230ba5b03130ec141e91e6431de9380f894a",
    "representativeComputationSha256": "5b18724deacc4db3635194799f6ac0df0916acbf864f8116e5881628cec8620a",
    "cloneSemanticComputationSha256": "036284a1a73ba50db62508069b9763fee9d96b8f021b06f1778c8323a1c18525",
    "baselineSemanticsSha256": "5408211f5e26a7d5cd7a74f9f1530b068f29fde1bbe4b8cbcecef4df3b500cc1",
    "originalDefinitionSourceMetadataSha256": "a06b4b45b726fc945ec54c715243196137944023d7e89c8072d22aa4d2348381",
    "exactGraphKeys": [
      "operationCompositionV1",
      "inputParameterIds",
      "scopeRequirementV1",
      "sourceWholeObjectBoundaryR5",
      "sourceWholeOperationBoundaryV1"
    ]
  }
};
const PROJECT_SCOPE_SUCCESSOR_KEY_R1='projectScopeMetadataSuccessorV1';
const PROJECT_SCOPE_BASELINE_SEMANTICS_R1=['input_values','input_classification','uom_by_parameter',
  'formula_consumer_ids','resource_consumer_row_ids','normative_source_ids','guide_provenance_ru',
  'proposal_source_refs','validation_scenario_refs','contract_version','acceptance_evidence_sha256'] as const;
const projectScopeValueSha256R1=(value:unknown):string=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
const projectScopeBaselineValueR1=(baseline:Json):Json=>Object.fromEntries(PROJECT_SCOPE_BASELINE_SEMANTICS_R1.map(k=>[k,baseline[k]]));
function projectScopeComputationValueR1(next:Computation,clone:boolean):Computation {
  const omit=(row:Json,fields:readonly string[]):Json=>Object.fromEntries(Object.entries(row).filter(([key])=>!fields.includes(key)));
  return clone?{
    parameters:next.parameters.map(p=>omit(p,['definition_version_id','created_at','approved_template_baseline_id'])),
    formulas:next.formulas.map(f=>omit(f,['definition_version_id','created_at'])),
    resources:next.resources.map(r=>omit(r,['id','definition_version_id','created_at','row_sha256'])),
  }:{parameters:next.parameters,formulas:next.formulas,resources:next.resources};
}
/** Same code-owned exact-anchor pattern as operationCompositionOnly. Arbitrary
 * caller hashes cannot register a source, norm, project fact or resource. */
export function assertMasterProjectScopeMetadataDeclarationR1(input:Readonly<{
  catalogId:string; capture:MasterRetainedParentCaptureR1; captureSha256:string;
  mode:MasterProjectScopeMetadataOnlyV1; newParameterSources:unknown;
}>):void {
  const {capture:c,mode:m}=input,a=MASTER_PROJECT_SCOPE_CURRENT_ANCHORS_R1[input.catalogId];
  const check=(v:unknown,code:string):void=>{if(!v)throw Error('MASTER_PROJECT_SCOPE_METADATA_'+code);};
  if(!a)throw Error('MASTER_PROJECT_SCOPE_METADATA_REGISTERED_CURRENT_PARENT_REQUIRED');
  check(object(m)&&boundedProfileMetadataR1(m)&&Buffer.byteLength(JSON.stringify(m))<=65536
    &&exactKeys(m,['contract','capturedContentPassport','capturedContentPassportSha256','newProjectParameterIds',
      'newProjectParametersSha256','resourceGraphChangesSha256','scopeOnly','sourceAdmission','engineeringAcceptance',
      ...(Object.hasOwn(m,'originCurrentMembershipV1')?['originCurrentMembershipV1']:[])])
    &&m.contract==='master-retained-project-scope-metadata-only/v1'
    &&m.scopeOnly===true&&m.sourceAdmission===false&&m.engineeringAcceptance===false,'EXPLICIT_BOUNDED_DECLARATION');
  if(Object.hasOwn(m,'originCurrentMembershipV1')){
    const origin=m.originCurrentMembershipV1;
    check(object(origin)&&exactKeys(origin,['contract','frozenOriginDefinitionReleaseId','frozenOriginSearchReleaseId','nativeCaptureSha256'])
      &&origin.contract==='master-project-scope-origin-current-membership/r1'
      &&origin.frozenOriginDefinitionReleaseId===a.parentDefinitionReleaseId
      &&origin.frozenOriginSearchReleaseId===a.parentSearchReleaseId
      &&origin.nativeCaptureSha256===a.captureSha256,'EXACT_FROZEN_ORIGIN');
  }
  check(input.captureSha256===a.captureSha256&&masterRetainedParentCaptureSha256R1(c)===a.captureSha256
    &&c.definition.catalog_id===input.catalogId&&c.definition.id===a.definitionId
    &&c.definition.definition_sha256===a.definitionSha256&&c.baseline.id===a.baselineId,'EXACT_CURRENT_CAPTURE');
  check(m.capturedContentPassportSha256===a.capturedContentPassportSha256
    &&projectScopeValueSha256R1(m.capturedContentPassport)===a.capturedContentPassportSha256
    &&m.capturedContentPassport.definition_version_id===c.definition.id
    &&m.capturedContentPassport.catalog_id===input.catalogId,'EXACT_CAPTURED_PASSPORT');
  check(same(m.newProjectParameterIds,a.newProjectParameterIds)
    &&m.newProjectParametersSha256===a.newProjectParametersSha256
    &&m.resourceGraphChangesSha256===a.resourceGraphChangesSha256,'REGISTERED_PROJECT_DELTA');
  check(same(input.newParameterSources,{})
    &&!Object.hasOwn(c.definition.source_metadata,PROJECT_SCOPE_SUCCESSOR_KEY_R1),'NO_NEW_SOURCES_OR_COLLIDING_SLOT');
}
export function masterProjectScopeMetadataCompactR1(opt:MasterRetainParentBindingsR1):Json|undefined {
  const m=opt.projectScopeMetadataOnlyV1;
  return m==null?undefined:{contract:m.contract,capturedParentSha256:opt.capturedParentSha256,
    capturedContentPassportSha256:m.capturedContentPassportSha256,newProjectParameterIds:[...m.newProjectParameterIds],
    newProjectParametersSha256:m.newProjectParametersSha256,resourceGraphChangesSha256:m.resourceGraphChangesSha256,
    scopeOnly:true,quantitySourcesChanged:false,sourceAdmission:false,engineeringAcceptance:false,
    ...(Object.hasOwn(m,'originCurrentMembershipV1')?{originCurrentMembershipV1:{...m.originCurrentMembershipV1}}:{})};
}
function assertProjectScopeMetadataDeclarationInRetainedR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):void {
  const c=opt.capturedParent,m=opt.projectScopeMetadataOnlyV1;
  requireThat(m!=null&&exactKeys(opt,['capturedParent','capturedParentSha256','newParameterSources','projectScopeMetadataOnlyV1'])
    &&input.config.catalogAppend==null&&input.config.projectSourcePackagePath==null,input,'SCOPE_METADATA_EXCLUSIVE');
  assertMasterProjectScopeMetadataDeclarationR1({catalogId:input.config.catalogId,capture:c,
    captureSha256:opt.capturedParentSha256,mode:m,newParameterSources:opt.newParameterSources});
  const a=MASTER_PROJECT_SCOPE_CURRENT_ANCHORS_R1[input.config.catalogId]!;
  // Absence keeps the exact historical tuple guard. Explicit origin opt-in
  // defers only that tuple equality; it never proves requested IDs are current.
  // Existing publisher pointer + normal/locked snapshot and registry guards
  // remain mandatory before any DML; the code-owned native anchor is unchanged.
  if(!Object.hasOwn(m,'originCurrentMembershipV1'))requireThat(input.config.parentReleaseId===a.parentDefinitionReleaseId
    &&input.config.parentSearchReleaseId===a.parentSearchReleaseId,input,'SCOPE_METADATA_CURRENT_RELEASE_TUPLE');
  const source=c.normativeSources.find(s=>s.id===input.newSource.id);
  requireThat(source&&same(input.newSource,Object.fromEntries(Object.entries(source).filter(([key])=>key!=='created_at')))
    &&Array.isArray(input.newLocators)&&same(records(input.newLocators),records(c.normativeLocators.filter(l=>l.source_id===source.id)))
    &&input.newLocators.length>0,input,'SCOPE_METADATA_EXACT_EXISTING_SOURCE_AND_LOCATORS');
  const reuse=input.config.binding.reuseExistingNormativeRegistry;
  requireThat(object(reuse)&&exactKeys(reuse,['contract','source','locators','locatorExcerptHashKind'])
    &&reuse.contract==='master-existing-normative-registry-reuse/r1'
    &&reuse.locatorExcerptHashKind==='CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1'
    &&same(reuse.source,source)&&Array.isArray(reuse.locators)&&same(records(reuse.locators),records(input.newLocators)),input,'SCOPE_METADATA_EXISTING_REGISTRY_REUSE');
}
function assertProjectScopeMetadataComputationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  next:Computation,phase:'REPRESENTATIVE'|'PLAN'):void {
  const c=opt.capturedParent,m=opt.projectScopeMetadataOnlyV1!,a=MASTER_PROJECT_SCOPE_CURRENT_ANCHORS_R1[input.config.catalogId]!;
  requireThat(Array.isArray(next.parameters)&&Array.isArray(next.formulas)&&Array.isArray(next.resources)
    &&next.parameters.length===c.parameters.length+a.newProjectParameterIds.length
    &&same(next.formulas.map(f=>f.formula_id),c.formulas.map(f=>f.formula_id))
    &&same(next.resources.map(r=>r.row_id),c.resources.map(r=>r.row_id)),input,'SCOPE_METADATA_NATIVE_ROW_SET');
  const added=projectScopeComputationValueR1(next,phase==='PLAN').parameters.slice(c.parameters.length);
  requireThat(same(added.map(p=>p.parameter_id),a.newProjectParameterIds)
    &&added.every(p=>p.required===false&&p.default_value===null&&p.unit_id===null
      &&['text','enum'].includes(p.value_type)&&p.truth_metadata?.value_source_role==='PROJECT_SPECIFIC_INPUT'
      &&p.truth_metadata?.provenance?.consumer_input_role_v1==='OBJECT_FACT')
    &&projectScopeValueSha256R1(added)===a.newProjectParametersSha256,input,'SCOPE_METADATA_SCHEMA_ONLY_PROJECT_FIELDS');
  const graphs:Json={};
  next.resources.forEach((r,index)=>{
    const old=c.resources[index]!;
    if(same(r.resource_graph,old.resource_graph))return;
    requireThat(object(r.resource_graph)&&object(old.resource_graph)
      &&Object.keys({...old.resource_graph,...r.resource_graph}).filter(k=>!same(old.resource_graph[k]??null,r.resource_graph[k]??null))
        .every(k=>a.exactGraphKeys.includes(k)),input,'SCOPE_METADATA_GRAPH_KEYS');
    graphs[r.row_id]=r.resource_graph;
  });
  requireThat(projectScopeValueSha256R1(graphs)===m.resourceGraphChangesSha256,input,'SCOPE_METADATA_EXACT_GRAPH_DELTA');
  requireThat(projectScopeValueSha256R1(projectScopeComputationValueR1(next,phase==='PLAN'))
    ===(phase==='PLAN'?a.cloneSemanticComputationSha256:a.representativeComputationSha256),input,'SCOPE_METADATA_EXACT_COMPUTATION');
}
function projectScopeMetadataRepresentativeR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  next:Readonly<{newBindings:readonly Json[];successorProvenance:Json}>) {
  const c=opt.capturedParent;
  requireThat(Array.isArray(next.newBindings)&&next.newBindings.length===0,input,'SCOPE_METADATA_NO_NEW_BINDINGS');
  requireThat(next.successorProvenance.parentDefinitionId===c.definition.id&&next.successorProvenance.parentBaselineId===c.baseline.id
    &&next.successorProvenance.capturedParentSha256===opt.capturedParentSha256
    &&same(next.successorProvenance.projectScopeMetadataOnlyV1,masterProjectScopeMetadataCompactR1(opt)),input,'SCOPE_METADATA_COMPACT_PROVENANCE');
  return {bindings:c.bindings.map(b=>({row_id:c.resources.find(r=>r.id===b.resource_spec_id)!.row_id,
    locator_id:b.locator_id,applicability:normalized(b.applicability)})),normativeSourceIds:normalized(c.baseline.normative_source_ids),
    sourceMetadata:{...normalized(c.definition.source_metadata),[PROJECT_SCOPE_SUCCESSOR_KEY_R1]:normalized(next.successorProvenance)},
    expectedNormativeBindingCount:c.bindings.length,normativeSourceClosure:c.normativeSources.map(s=>s.source_key)};
}
function assertProjectScopeMetadataPlanR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  plan:Readonly<{baseline:Json;definition:Json;passport?:Json}>):void {
  const c=opt.capturedParent,a=MASTER_PROJECT_SCOPE_CURRENT_ANCHORS_R1[input.config.catalogId]!;
  requireThat(projectScopeValueSha256R1(projectScopeBaselineValueR1(plan.baseline))===a.baselineSemanticsSha256
    &&plan.baseline.source_definition_version_id===c.definition.id&&plan.baseline.supersedes_baseline_id===c.baseline.id,
    input,'SCOPE_METADATA_ALL_OLD_BASELINE_MAPS');
  requireThat(same(plan.definition.passport,c.definition.passport)&&same(plan.definition.applicability,c.definition.applicability),
    input,'SCOPE_METADATA_DEFINITION_SCOPE');
  // These are clone-plan structural counters, not quantitative provenance.
  // The real publisher recomputes them from the exact candidate arrays.
  const captured=opt.projectScopeMetadataOnlyV1!.capturedContentPassport;
  requireThat(plan.passport&&plan.passport.parameter_count===c.parameters.length+opt.projectScopeMetadataOnlyV1!.newProjectParameterIds.length
    &&plan.passport.formula_count===c.formulas.length&&plan.passport.resource_count===c.resources.length
    &&captured.parameter_count===c.parameters.length&&captured.formula_count===c.formulas.length
    &&captured.resource_count===c.resources.length,input,'SCOPE_METADATA_EXACT_CLONE_PASSPORT_COUNTS');
  const omit=(v:Json):Json=>Object.fromEntries(Object.entries(v).filter(([k])=>
    !['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at',
      'parameter_count','formula_count','resource_count'].includes(k)));
  requireThat(plan.passport&&same(omit(plan.passport),omit(captured)),
    input,'SCOPE_METADATA_QUANTITATIVE_PASSPORT_UNCHANGED');
}

const AUTHORITY_SOURCE_ROLES_R1=new Set(['PROJECT_DOCUMENTATION','ENGINEERING_DESIGN','SITE_SURVEY',
  'MANDATORY_NORM_VALUE','MANUFACTURER_CONFIRMED','SELECTED_EQUIPMENT_PASSPORT',
  'SOURCE_BACKED_PRELIMINARY_PROFILE','NORM_REQUIRED_BUT_PROJECT_SELECTED']);
const omitAuthority=(v:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(v).filter(([key])=>!keys.includes(key)));
/** Compact append proof only. Full before/after declarations stay in the
 * source Config; source metadata never embeds another full calculation. */
export function masterRetainedSourceProfileMetadataCompactR1(mode:MasterRetainParentBindingsR1['truthAuthorityOnlyV1']):Json|undefined{
  const p=mode?.sourceProfileMetadataOnlyV1;
  return p==null?undefined:{contract:p.contract,capturedApplicabilitySha256:p.capturedApplicabilitySha256,
    sourceProfileSelectionMetadataSha256:p.sourceProfileSelectionMetadataSha256,
    selectorParameterId:p.sourceProfileSelectionMetadata.selectorParameterId,
    capturedSelectorTruthMetadataSha256:p.selectorChange.capturedTruthMetadataSha256,
    afterSelectorTruthMetadataSha256:p.selectorChange.afterTruthMetadataSha256,
    ...(p.inputPresentationOnlyV1==null?{}:{inputPresentationOnlyV1:{
      contract:p.inputPresentationOnlyV1.contract,legacySelectorValue:p.inputPresentationOnlyV1.legacySelectorValue,
      changesSha256:p.inputPresentationOnlyV1.changesSha256,
      parameterIds:Object.keys(p.inputPresentationOnlyV1.changes).sort()}}),
    ...(p.existingSourceConsumerReuseV1==null?{}:{existingSourceConsumerReuseV1:{
      contract:p.existingSourceConsumerReuseV1.contract,resourceChangesSha256:p.existingSourceConsumerReuseV1.resourceChangesSha256,
      additionsSha256:p.existingSourceConsumerReuseV1.additionsSha256,truthChangesSha256:p.existingSourceConsumerReuseV1.truthChangesSha256,
      rowIds:Object.keys(p.existingSourceConsumerReuseV1.resourceChanges).sort(),
      parameterIds:Object.keys(p.existingSourceConsumerReuseV1.truthChanges).sort()}})};
}
function boundedProfileMetadataR1(value:unknown):boolean{
  const pending:{value:unknown;depth:number}[]=[{value,depth:0}];let nodes=0;
  while(pending.length){
    const item=pending.pop()!;if(++nodes>4096||item.depth>16)return false;
    const v=item.value;
    if(v===null||typeof v==='string'||typeof v==='boolean')continue;
    if(typeof v==='number'){if(!Number.isFinite(v))return false;continue;}
    if(!Array.isArray(v)&&!object(v))return false;
    for(const child of Object.values(v))pending.push({value:child,depth:item.depth+1});
  }
  return Buffer.byteLength(encoded(value))<=65536;
}
function assertSourceProfileMetadataDeclarationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):void{
  const m=opt.truthAuthorityOnlyV1!,p=m.sourceProfileMetadataOnlyV1,c=opt.capturedParent;
  if(p===undefined)return;
  requireThat(object(p)&&exactKeys(p,['contract','capturedApplicabilitySha256','sourceProfileSelectionMetadata','sourceProfileSelectionMetadataSha256','selectorChange',
      ...(Object.hasOwn(p,'inputPresentationOnlyV1')?['inputPresentationOnlyV1']:[]),
      ...(Object.hasOwn(p,'existingSourceConsumerReuseV1')?['existingSourceConsumerReuseV1']:[])])
    &&p.contract==='master-retained-source-profile-metadata-only/v1'
    &&typeof p.capturedApplicabilitySha256==='string'&&hashPattern.test(p.capturedApplicabilitySha256)
    &&valueSha256(c.definition.applicability)===p.capturedApplicabilitySha256
    &&object(p.sourceProfileSelectionMetadata)&&boundedProfileMetadataR1(p.sourceProfileSelectionMetadata)
    &&typeof p.sourceProfileSelectionMetadataSha256==='string'&&hashPattern.test(p.sourceProfileSelectionMetadataSha256)
    &&valueSha256(p.sourceProfileSelectionMetadata)===p.sourceProfileSelectionMetadataSha256,input,'PROFILE_METADATA_DECLARATION');
  const metadata=p.sourceProfileSelectionMetadata,id=metadata.selectorParameterId,selector=c.parameters.find(q=>q.parameter_id===id),change=p.selectorChange;
  requireThat(metadata.contract==='canonical-source-profile-selection/v1'
    &&id===c.definition.applicability?.primaryMeasureSelectionV1?.selectorParameterId
    &&selector?.value_type==='enum'&&selector.unit_id===null&&selector.default_value===null
    &&object(selector.truth_metadata)&&object(selector.truth_metadata.guide)
    &&((selector.truth_metadata.visibility_role==='USER_INPUT'&&selector.truth_metadata.value_source_role==='PROJECT_SPECIFIC_INPUT'
        &&selector.truth_metadata.provenance?.consumer_input_role_v1==='OBJECT_FACT')
      ||(selector.truth_metadata.visibility_role==='INTERNAL_ONLY'&&selector.truth_metadata.value_source_role==='SOURCE_BACKED_PRELIMINARY_PROFILE'
        &&selector.truth_metadata.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL'))
    &&selector.truth_metadata.source_confirmation_required===false&&!Object.hasOwn(m.changes,id)
    &&object(change)&&exactKeys(change,['capturedTruthMetadata','capturedTruthMetadataSha256','afterTruthMetadataSha256'])
    &&object(change.capturedTruthMetadata)&&typeof change.capturedTruthMetadataSha256==='string'&&hashPattern.test(change.capturedTruthMetadataSha256)
    &&same(change.capturedTruthMetadata,selector.truth_metadata)&&valueSha256(selector.truth_metadata)===change.capturedTruthMetadataSha256
    &&typeof change.afterTruthMetadataSha256==='string'&&hashPattern.test(change.afterTruthMetadataSha256)
    &&(!same(metadata,c.definition.applicability?.sourceProfileSelectionV1??null)
      ||change.afterTruthMetadataSha256!==change.capturedTruthMetadataSha256),input,'PROFILE_SELECTOR_OLD_TRUTH_ANCHOR');
  assertSourceProfileInputPresentationDeclarationR1(input,opt);
  assertExistingSourceConsumerReuseDeclarationR1(input,opt);
  requireThat(Array.isArray(metadata.profiles)&&metadata.profiles.length>0&&metadata.profiles.length<=64,input,'PROFILE_SOURCE_LIST');
  for(const profile of metadata.profiles){
    requireThat(object(profile)&&Array.isArray(profile.sources)&&profile.sources.length>0&&profile.sources.length<=16,input,'PROFILE_SOURCE_LIST');
    for(const source of profile.sources){
      const registered=c.normativeSources.find(s=>s.source_key===source?.sourceId);
      requireThat(object(source)&&registered&&source.artifactSha256===registered.artifact_sha256
        &&c.resources.some(r=>Array.isArray(r.source_metadata?.normativeTrace)&&r.source_metadata.normativeTrace.some((trace:Json)=>
          trace.normId===registered.source_key&&trace.sourceSnapshotHash===registered.artifact_sha256&&trace.sourceLocator===source.locator)),
        input,'PROFILE_EXISTING_REGISTERED_SOURCE_AND_EXACT_TRACE');
    }
  }
}
/** Reconstruct the only permitted after-truth from the exact captured row.
 * Geometry remains measured; historical inputs are shown on the legacy branch.
 * No calculation, document, source guide or stored baseline is changed. */
function sourceProfileInputPresentationTruthR1(opt:MasterRetainParentBindingsR1,old:Json):Json{
  const profile=opt.truthAuthorityOnlyV1!.sourceProfileMetadataOnlyV1!,presentation=profile.inputPresentationOnlyV1!;
  const metadata=profile.sourceProfileSelectionMetadata,truth=old.truth_metadata;
  if(metadata.geometryParameterIds.includes(old.parameter_id))return{...truth,
    provenance:{...truth.provenance,consumer_input_role_v1:'OBJECT_FACT'},visible_when:{kind:'literal',value:true}};
  const legacy={kind:'selected',parameterId:metadata.selectorParameterId,value:presentation.legacySelectorValue};
  return{...truth,visible_when:truth.visible_when===undefined?legacy:{kind:'and',operands:[legacy,truth.visible_when]}};
}
function isDeclaredMeasuredTechnicalTakeoffR1(opt:MasterRetainParentBindingsR1,p:AppendJsonV1):boolean{
  const profile=opt.truthAuthorityOnlyV1?.sourceProfileMetadataOnlyV1,c=opt.capturedParent;
  if(!profile||!['decimal','integer'].includes(String(p.value_type))||p.default_value!==null
    ||typeof p.unit_id!=='string'||!p.unit_id||!record(p.truth_metadata))return false;
  const t=p.truth_metadata,g=t.guide,id=String(p.parameter_id);
  if(t.visibility_role!=='USER_INPUT'||t.value_source_role!=='USER_MEASURED'
    ||!record(t.provenance)||t.provenance.consumer_input_role_v1!=='OBJECT_GEOMETRY'
    ||t.source_confirmation_required!==false||!record(g)||g.guide_kind!=='MEASUREMENT_RULE'
    ||typeof g.source_document!=='string'||!g.source_document||typeof g.source_locator!=='string'||!g.source_locator
    ||typeof g.source_snapshot_hash!=='string'||!hashPattern.test(g.source_snapshot_hash)
    ||!c.normativeSources.some(row=>row.artifact_sha256===g.source_snapshot_hash))return false;
  const metadata=profile.sourceProfileSelectionMetadata,primary=c.definition.applicability?.primaryMeasureSelectionV1;
  return !primary?.selections?.some((row:AppendJsonV1)=>row.primaryMeasureParameterId===id)
    &&!metadata.geometryParameterIds?.includes(id)
    &&!metadata.profiles?.some((row:AppendJsonV1)=>Array.isArray(row.geometryCopies)
      &&row.geometryCopies.some(copy=>record(copy)&&(copy.fromParameterId===id||copy.toParameterId===id)));
}
function reuseInclusionNodesR1(ast:AppendJsonV1):AppendJsonV1[]{
  const pending=[ast],result:AppendJsonV1[]=[];
  while(pending.length){const node=pending.pop()!;result.push(node);
    if(record(node.operand))pending.push(node.operand);
    const children=Array.isArray(node.operands)?node.operands:Array.isArray(node.conditions)?node.conditions:[];
    for(const child of children)if(record(child))pending.push(child);
  }return result;
}
function existingSourceConsumerTruthR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,old:AppendJsonV1):AppendJsonV1{
  const profile=opt.truthAuthorityOnlyV1!.sourceProfileMetadataOnlyV1!,reuse=profile.existingSourceConsumerReuseV1!;
  const change=reuse.truthChanges[String(old.parameter_id)]!,prior=old.truth_metadata;
  requireThat(record(prior)&&old.default_value===null&&record(prior.provenance)&&record(prior.guide),input,'PROFILE_REUSE_OLD_TRUTH');
  const base=sourceProfileInputPresentationTruthR1(opt,old);
  if(change.kind==='EXISTING_MEASURED_GEOMETRY_VISIBILITY'){
    requireThat(['decimal','integer'].includes(String(old.value_type))&&typeof old.unit_id==='string'&&old.unit_id.length>0
      &&prior.visibility_role==='USER_INPUT'&&prior.value_source_role==='USER_MEASURED'
      &&prior.provenance.consumer_input_role_v1==='OBJECT_FACT'&&!change.guideShortCorrection,input,'PROFILE_REUSE_MEASURED_TRUTH');
    return{...base,visible_when:{kind:'or',operands:[base.visible_when,
      {kind:'selected',parameterId:profile.sourceProfileSelectionMetadata.selectorParameterId,value:reuse.profileSelectorValue}]}};
  }
  requireThat(change.kind==='EXISTING_DOCUMENT_AUTHORITY'&&old.value_type==='enum'
    &&prior.visibility_role==='USER_INPUT'&&prior.value_source_role==='PROJECT_SPECIFIC_INPUT'
    &&prior.provenance.consumer_input_role_v1==='OBJECT_FACT'&&prior.source_confirmation_required===false
    &&prior.guide.source_role==='PROJECT_DOCUMENTATION',input,'PROFILE_REUSE_DOCUMENT_TRUTH');
  const correction=change.guideShortCorrection,guide={...prior.guide};
  if(correction){requireThat(record(correction)&&keys(correction,['capturedShortRu','afterShortRu'])
    &&typeof correction.capturedShortRu==='string'&&correction.capturedShortRu===guide.guide_short_ru
    &&typeof correction.afterShortRu==='string'&&correction.afterShortRu.length>0&&correction.afterShortRu.length<=8192
    &&correction.afterShortRu!==correction.capturedShortRu,input,'PROFILE_REUSE_GUIDE_SHORT');guide.guide_short_ru=correction.afterShortRu;}
  return{...base,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
    provenance:{...prior.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide};
}
function assertExistingSourceConsumerReuseDeclarationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):void{
  const authority=opt.truthAuthorityOnlyV1!,profile=authority.sourceProfileMetadataOnlyV1!,reuse=profile.existingSourceConsumerReuseV1,c=opt.capturedParent;
  if(reuse===undefined)return;
  requireThat(record(reuse)&&keys(reuse,['contract','profileSelectorValue','additionsBySha256','resourceChanges','locatorGroups','truthChanges',
    'resourceChangesSha256','additionsSha256','truthChangesSha256'])&&reuse.contract==='master-retained-existing-source-consumer-reuse/v1'
    &&boundedProfileMetadataR1(reuse)&&profile.inputPresentationOnlyV1!=null
    &&typeof reuse.profileSelectorValue==='string'&&profile.sourceProfileSelectionMetadata.profiles.filter((p:AppendJsonV1)=>p.selectorValue===reuse.profileSelectorValue).length===1,
    input,'PROFILE_REUSE_DECLARATION');
  requireThat(record(reuse.resourceChanges)&&Object.keys(reuse.resourceChanges).length>0&&Object.keys(reuse.resourceChanges).length<=16
    &&record(reuse.additionsBySha256)&&Object.keys(reuse.additionsBySha256).length>0&&Object.keys(reuse.additionsBySha256).length<=16
    &&record(reuse.locatorGroups)&&record(reuse.truthChanges)&&Object.keys(reuse.truthChanges).length<=6
    &&valueSha256(reuse.resourceChanges)===reuse.resourceChangesSha256&&valueSha256(reuse.additionsBySha256)===reuse.additionsSha256
    &&valueSha256(reuse.truthChanges)===reuse.truthChangesSha256,input,'PROFILE_REUSE_MAPS');
  const metadata=profile.sourceProfileSelectionMetadata,selectorId=metadata.selectorParameterId;
  for(const[id,change]of Object.entries(reuse.truthChanges)){
    const old=c.parameters.find(p=>p.parameter_id===id);
    requireThat(old&&id!==selectorId&&!Object.hasOwn(authority.changes,id)&&!Object.hasOwn(profile.inputPresentationOnlyV1!.changes,id)
      &&record(change)&&keys(change,['kind','capturedTruthMetadataSha256','afterTruthMetadataSha256',...(Object.hasOwn(change,'guideShortCorrection')?['guideShortCorrection']:[])])
      &&valueSha256(old.truth_metadata)===change.capturedTruthMetadataSha256
      &&valueSha256(existingSourceConsumerTruthR1(input,opt,old))===change.afterTruthMetadataSha256,input,'PROFILE_REUSE_TRUTH_ANCHOR');
  }
  const selected=(n:AppendJsonV1)=>keys(n,['kind','parameterId','value'])&&n.kind==='selected'&&n.parameterId===selectorId&&n.value===reuse.profileSelectorValue;
  const measured=(id:unknown)=>{const p=c.parameters.find(p=>p.parameter_id===id);return p&&['decimal','integer'].includes(p.value_type)
    &&p.default_value===null&&typeof p.unit_id==='string'&&p.unit_id.length>0
    &&(metadata.geometryParameterIds.includes(id)||reuse.truthChanges[String(id)]?.kind==='EXISTING_MEASURED_GEOMETRY_VISIBILITY');};
  const positive=(n:AppendJsonV1)=>keys(n,['kind','parameterId','value'])&&n.kind==='greater_than'&&n.value===0&&measured(n.parameterId);
  const capturedNodes=c.resources.flatMap(row=>reuseInclusionNodesR1(row.inclusion_ast));
  const capturedAnd=new Set(capturedNodes.filter(n=>n.kind==='and').map(valueSha256));
  const capturedEquals=new Set(capturedNodes.filter(n=>n.kind==='equals').map(valueSha256));
  const equals=(n:AppendJsonV1)=>{const p=c.parameters.find(p=>p.parameter_id===n.parameterId);return keys(n,['kind','parameterId','value'])
    &&n.kind==='equals'&&n.parameterId!==selectorId&&p?.value_type==='enum'&&p.default_value===null
    &&p.constraints_json?.values?.includes(n.value)&&capturedEquals.has(valueSha256(n));};
  for(const[sha,addition]of Object.entries(reuse.additionsBySha256)){
    requireThat(hashPattern.test(sha)&&record(addition)&&keys(addition,['kind','operands'])&&addition.kind==='and'
      &&Array.isArray(addition.operands)&&addition.operands.length>=2&&addition.operands.every(record)
      &&valueSha256(addition)===sha&&addition.operands.every(n=>selected(n)||positive(n)||equals(n)||(n.kind==='and'&&capturedAnd.has(valueSha256(n))))
      &&canonicalConditionParameterIds(addition).every(id=>c.parameters.some(p=>p.parameter_id===id))
      &&reuseInclusionNodesR1(addition).some(selected),input,'PROFILE_REUSE_ADDITION_AST');
    try{resolveInclusionGraph(addition,{});}catch{fail(input,'PROFILE_REUSE_ADDITION_AST');}
  }
  requireThat(same(Object.keys(reuse.additionsBySha256).sort(),setOf(Object.values(reuse.resourceChanges).map(r=>r.additionSha256)))
    &&same(Object.keys(reuse.locatorGroups).sort(),setOf(Object.values(reuse.resourceChanges).map(r=>r.existingLocatorId))),input,'PROFILE_REUSE_DICTIONARY_SCOPE');
  for(const[lid,group]of Object.entries(reuse.locatorGroups)){
    const loc=c.normativeLocators.find(l=>l.id===lid),source=c.normativeSources.find(s=>s.id===loc?.source_id);
    const boundRows=c.bindings.filter(b=>b.locator_id===lid).map(b=>c.resources.find(r=>r.id===b.resource_spec_id)!.row_id);
    requireThat(record(group)&&keys(group,['existingSourceId','capturedSourceSha256','capturedLocatorSha256','capturedBoundRowIds'])
      &&loc&&source&&group.existingSourceId===source.id&&valueSha256(source)===group.capturedSourceSha256&&valueSha256(loc)===group.capturedLocatorSha256
      &&Array.isArray(group.capturedBoundRowIds)&&group.capturedBoundRowIds.length>0&&new Set(group.capturedBoundRowIds).size===group.capturedBoundRowIds.length
      &&same([...group.capturedBoundRowIds].sort(),[...boundRows].sort())
      &&same([...boundRows].sort(),Object.entries(reuse.resourceChanges).filter(([,r])=>r.existingLocatorId===lid).map(([id])=>id).sort()),input,'PROFILE_REUSE_WHOLE_LOCATOR');
  }
  const chosen=metadata.profiles.find((p:AppendJsonV1)=>p.selectorValue===reuse.profileSelectorValue);
  for(const[id,change]of Object.entries(reuse.resourceChanges)){
    const old=c.resources.find(r=>r.row_id===id),bindings=c.bindings.filter(b=>b.resource_spec_id===old?.id),addition=reuse.additionsBySha256[change.additionSha256];
    requireThat(old&&record(change)&&keys(change,['capturedInclusionSha256','afterInclusionSha256','additionSha256','existingBindingSha256','existingLocatorId'])
      &&bindings.length===1&&bindings[0]!.locator_id===change.existingLocatorId&&valueSha256(bindings[0])===change.existingBindingSha256
      &&valueSha256(old.inclusion_ast)===change.capturedInclusionSha256&&addition
      &&valueSha256({kind:'or',operands:[old.inclusion_ast,addition]})===change.afterInclusionSha256,input,'PROFILE_REUSE_RESOURCE_ANCHOR');
    const nodes=reuseInclusionNodesR1(addition),formula=c.formulas.find(f=>f.formula_id===old.formula_id)!;
    const ownMeasured=formula.input_parameter_ids.filter(measured),unknownInfo=ownMeasured.length===0&&old.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'
      &&old.procurement_eligible===false&&formula.input_parameter_ids.length>0&&formula.input_parameter_ids.every((pid:string)=>{
        const p=c.parameters.find(q=>q.parameter_id===pid);return p?.default_value===null&&p?.truth_metadata?.value_source_role==='UNRESOLVED_APPLICATION_NORM';});
    requireThat(ownMeasured.length>0?ownMeasured.some((pid:string)=>nodes.some(n=>positive(n)&&n.parameterId===pid)):
      unknownInfo&&metadata.geometryParameterIds.some((pid:string)=>nodes.some(n=>positive(n)&&n.parameterId===pid)),input,'PROFILE_REUSE_OWN_GEOMETRY');
    const oldNodes=reuseInclusionNodesR1(old.inclusion_ast),oldPositive=old.inclusion_ast.kind==='and'&&Array.isArray(old.inclusion_ast.operands)
      &&old.inclusion_ast.operands.length===2&&old.inclusion_ast.operands.filter((n:AppendJsonV1)=>n.kind==='not').length===1
      ?old.inclusion_ast.operands.find((n:AppendJsonV1)=>n.kind!=='not'):undefined;
    const preservedOldPositive=oldPositive&&addition.operands.some(n=>same(n,oldPositive));
    const capturedProfileConsumer=addition.operands.some(n=>n.kind==='and'&&c.resources.some(r=>same(r.inclusion_ast,n)
      &&r.source_metadata?.sourceNormQuantityAccepted===true&&reuseInclusionNodesR1(n).some(selected)
      &&r.source_metadata.normativeTrace?.some((trace:AppendJsonV1)=>chosen.sources.some((src:AppendJsonV1)=>src.sourceId===trace.normId&&src.artifactSha256===trace.sourceSnapshotHash))));
    requireThat(unknownInfo||preservedOldPositive||capturedProfileConsumer,input,'PROFILE_REUSE_EXISTING_CONSUMER_SCOPE');
    const scopeIds=old.resource_graph.scopeContextParameterIds??[];
    requireThat(Array.isArray(scopeIds)&&scopeIds.every((pid:string)=>{
      const clauses=oldNodes.filter(n=>n.kind==='equals'&&n.parameterId===pid);return clauses.length>0&&clauses.every(clause=>nodes.some(n=>same(n,clause)));
    }),input,'PROFILE_REUSE_PROJECT_SCOPE');
  }
}

function assertSourceProfileInputPresentationDeclarationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):void{
  const mode=opt.truthAuthorityOnlyV1!,profile=mode.sourceProfileMetadataOnlyV1!,p=profile.inputPresentationOnlyV1;
  if(p===undefined)return;
  const capture=opt.capturedParent,metadata=profile.sourceProfileSelectionMetadata,
    selector=capture.parameters.find(q=>q.parameter_id===metadata.selectorParameterId);
  requireThat(object(p)&&exactKeys(p,['contract','legacySelectorValue','changes','changesSha256'])
    &&p.contract==='master-retained-source-profile-input-presentation-only/v1'
    &&typeof p.legacySelectorValue==='string'&&p.legacySelectorValue.length>0&&p.legacySelectorValue.length<=1000
    &&Array.isArray(selector?.constraints_json?.values)&&selector.constraints_json.values[0]===p.legacySelectorValue
    &&Array.isArray(metadata.profiles)&&metadata.profiles.every((q:Json)=>q.selectorValue!==p.legacySelectorValue)
    &&Array.isArray(metadata.geometryParameterIds)&&metadata.geometryParameterIds.length>0&&metadata.geometryParameterIds.length<=10,
    input,'PROFILE_INPUT_PRESENTATION_LEGACY_ANCHOR');
  requireThat(object(p.changes)&&Object.keys(p.changes).length>0&&Object.keys(p.changes).length<=64
    &&Buffer.byteLength(encoded(p.changes))<=262144&&valueSha256(p.changes)===p.changesSha256,
    input,'PROFILE_INPUT_PRESENTATION_CHANGE_MAP');
  for(const [id,change]of Object.entries(p.changes)){
    const old=capture.parameters.find(q=>q.parameter_id===id);
    requireThat(old&&id!==metadata.selectorParameterId&&!Object.hasOwn(mode.changes,id)
      &&!Object.hasOwn(profile.existingSourceConsumerReuseV1?.truthChanges??{},id)
      &&object(old.truth_metadata)&&object(change)
      &&exactKeys(change,['capturedTruthMetadata','capturedTruthMetadataSha256','afterTruthMetadataSha256'])
      &&same(change.capturedTruthMetadata,old.truth_metadata)
      &&valueSha256(old.truth_metadata)===change.capturedTruthMetadataSha256
      &&typeof change.afterTruthMetadataSha256==='string'&&hashPattern.test(change.afterTruthMetadataSha256)
      &&change.afterTruthMetadataSha256!==change.capturedTruthMetadataSha256,
      input,'PROFILE_INPUT_PRESENTATION_OLD_TRUTH_ANCHOR');
    if(metadata.geometryParameterIds.includes(id))requireThat(['decimal','integer'].includes(old.value_type)
      &&typeof old.unit_id==='string'&&old.unit_id.length>0&&old.default_value===null
      &&old.truth_metadata.visibility_role==='USER_INPUT'&&old.truth_metadata.value_source_role==='USER_MEASURED'
      &&['OBJECT_GEOMETRY','OBJECT_FACT'].includes(old.truth_metadata.provenance?.consumer_input_role_v1),
      input,'PROFILE_INPUT_PRESENTATION_MEASURED_GEOMETRY');
    requireThat(valueSha256(sourceProfileInputPresentationTruthR1(opt,old))===change.afterTruthMetadataSha256,
      input,'PROFILE_INPUT_PRESENTATION_AFTER_TRUTH_ANCHOR');
  }
}
function assertSourceProfileMetadataComputationR1(opt:MasterRetainParentBindingsR1,next:Computation):void{
  const p=opt.truthAuthorityOnlyV1?.sourceProfileMetadataOnlyV1;if(p==null)return;
  const schema=next.parameters.map(q=>({parameterId:q.parameter_id,valueType:q.value_type,unitId:q.unit_id,
    visibilityRole:q.truth_metadata?.visibility_role,valueSourceRole:q.truth_metadata?.value_source_role,
    provenance:q.truth_metadata?.provenance,defaultValue:q.default_value,constraints:q.constraints_json,
    formulaConsumers:next.formulas.filter(f=>f.input_parameter_ids?.includes(q.parameter_id)).map(f=>f.formula_id)}));
  // Existing shared producer/closure validator only. Empty user facts validate
  // the immutable declaration; no result is promoted into a runtime baseline.
  resolveCanonicalSourceProfileSelectionV1({parameterSchema:schema,
    sourceProfileSelectionMetadata:p.sourceProfileSelectionMetadata,confirmedParameters:{},effectiveUserParameters:{}});
}
/** General, explicitly pinned authority-only admission. This does not infer a
 * normative fact, set a default, or approve a project from a selected profile. */
function assertTruthAuthorityDeclarationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):void{
  const m=opt.truthAuthorityOnlyV1,c=opt.capturedParent;
  requireThat(object(m)&&exactKeys(m,['contract','capturedContentPassport','capturedContentPassportSha256','changes','changesSha256',
      ...(Object.hasOwn(m,'sourceProfileMetadataOnlyV1')?['sourceProfileMetadataOnlyV1']:[])])
    &&m.contract==='master-retained-truth-authority-only/v1',input,'AUTHORITY_DECLARATION');
  const prior=c.definition.source_metadata;
  requireThat(object(prior),input,'AUTHORITY_LINEAGE_METADATA');
  const hasRetainedHistory=[...PREFIX,KEY].some(key=>Object.hasOwn(prior,key));
  requireThat((hasRetainedHistory?Object.hasOwn(opt,'successorProvenanceAppendV1')
      :!Object.hasOwn(opt,'successorProvenanceAppendV1'))
    &&!['monolithicRepairGeometryVisibilityOnlyR60','operationCompositionOnly','successorProvenanceContinuation','legacyTemplateAssumptionSources',
      'legacyCapturedFixtureSources','formulaExpressionRepairs','capturedSourcePreimage'].some(k=>Object.hasOwn(opt,k))
    &&same(opt.newParameterSources,{}),input,'AUTHORITY_EXCLUSIVE_LINEAGE');
  requireThat(object(m.capturedContentPassport)&&valueSha256(m.capturedContentPassport)===m.capturedContentPassportSha256
    &&m.capturedContentPassport.definition_version_id===c.definition.id
    &&m.capturedContentPassport.catalog_id===input.config.catalogId,input,'AUTHORITY_PASSPORT_ANCHOR');
  requireThat(object(m.changes)&&(Object.keys(m.changes).length>0||Object.hasOwn(m,'sourceProfileMetadataOnlyV1'))&&Object.keys(m.changes).length<=64
    &&Buffer.byteLength(encoded(m.changes))<=262144&&valueSha256(m.changes)===m.changesSha256,input,'AUTHORITY_CHANGE_MAP');
  for(const [id,change]of Object.entries(m.changes)){
    const p=c.parameters.find(p=>p.parameter_id===id);
    requireThat(p&&object(change)
      &&id!==c.definition.applicability?.primaryMeasureSelectionV1?.selectorParameterId
      &&((['enum','text'].includes(p.value_type)&&p.truth_metadata?.visibility_role==='USER_INPUT'
        &&p.truth_metadata?.value_source_role==='PROJECT_SPECIFIC_INPUT'
        &&p.truth_metadata?.provenance?.consumer_input_role_v1==='OBJECT_FACT'
        &&p.truth_metadata?.source_confirmation_required===false)||isDeclaredMeasuredTechnicalTakeoffR1(opt,p))
      &&object(p.truth_metadata?.guide)
      &&exactKeys(change,['capturedTruthMetadata','capturedTruthMetadataSha256','afterTruthMetadataSha256'])
      &&object(change.capturedTruthMetadata)&&same(change.capturedTruthMetadata,p.truth_metadata)
      &&valueSha256(p.truth_metadata)===change.capturedTruthMetadataSha256
      &&typeof change.afterTruthMetadataSha256==='string'&&/^[0-9a-f]{64}$/u.test(change.afterTruthMetadataSha256)
      &&change.afterTruthMetadataSha256!==change.capturedTruthMetadataSha256,input,'AUTHORITY_OLD_TRUTH_ANCHOR');
  }
  assertSourceProfileMetadataDeclarationR1(input,opt);
  const reuse=input.config.binding.reuseExistingNormativeRegistry;
  requireThat(object(reuse)&&reuse.contract==='master-existing-normative-registry-reuse/r1'
    &&object(reuse.source)&&same(c.normativeSources.find(s=>s.id===reuse.source.id),reuse.source)
    &&same(input.newSource,omitAuthority(reuse.source,['created_at']))
    &&Array.isArray(reuse.locators)&&same(records(reuse.locators),records(input.newLocators))
    &&same(records(input.newLocators),records(c.normativeLocators.filter(l=>l.source_id===input.newSource.id))),
    input,'AUTHORITY_EXISTING_REGISTRY_CAPTURE');
}
function assertTruthAuthorityComputationR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  next:Computation,phase:'REPRESENTATIVE'|'PLAN'):void{
  const c=opt.capturedParent,m=opt.truthAuthorityOnlyV1!;
  assertSourceProfileMetadataComputationR1(opt,next);
  for(const [kind,idKey]of [['parameters','parameter_id'],['formulas','formula_id'],['resources','row_id']]as const){
    requireThat(Array.isArray(next[kind])&&next[kind].length===c[kind].length
      &&new Set(next[kind].map(r=>r[idKey])).size===c[kind].length,input,'AUTHORITY_NO_ADDED_OR_REMOVED_'+kind.toUpperCase());
    for(const old of c[kind]){
      const actual=next[kind].find(r=>r[idKey]===old[idKey]);requireThat(actual,input,'AUTHORITY_MISSING_'+kind.toUpperCase());
      let expected=old;
      if(kind==='parameters'&&old.parameter_id===m.sourceProfileMetadataOnlyV1?.sourceProfileSelectionMetadata.selectorParameterId){
        const truth=actual.truth_metadata,prior=old.truth_metadata,profile=m.sourceProfileMetadataOnlyV1!;
        requireThat(object(truth)&&valueSha256(truth)===profile.selectorChange.afterTruthMetadataSha256
          &&truth.visibility_role==='INTERNAL_ONLY'&&truth.value_source_role==='SOURCE_BACKED_PRELIMINARY_PROFILE'
          &&truth.source_confirmation_required===prior.source_confirmation_required
          &&truth.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL'
          &&same(omitAuthority(truth,['visibility_role','value_source_role','provenance','guide']),omitAuthority(prior,['visibility_role','value_source_role','provenance','guide']))
          &&same(omitAuthority(truth.provenance,['consumer_input_role_v1']),omitAuthority(prior.provenance??{},['consumer_input_role_v1']))
          &&object(truth.guide)&&same(omitAuthority(truth.guide,['source_role']),omitAuthority(prior.guide,['source_role']))
          &&truth.guide.source_role===truth.value_source_role,input,'PROFILE_SELECTOR_AFTER_TRUTH_FIELDS');
        expected={...old,truth_metadata:truth};
      }else if(kind==='parameters'&&Object.hasOwn(m.sourceProfileMetadataOnlyV1?.existingSourceConsumerReuseV1?.truthChanges??{},old.parameter_id)){
        const truth=existingSourceConsumerTruthR1(input,opt,old);
        requireThat(same(actual.truth_metadata,truth),input,'PROFILE_REUSE_AFTER_TRUTH');expected={...old,truth_metadata:truth};
      }else if(kind==='resources'&&Object.hasOwn(m.sourceProfileMetadataOnlyV1?.existingSourceConsumerReuseV1?.resourceChanges??{},old.row_id)){
        const reuse=m.sourceProfileMetadataOnlyV1!.existingSourceConsumerReuseV1!,change=reuse.resourceChanges[old.row_id]!;
        const ast={kind:'or',operands:[old.inclusion_ast,reuse.additionsBySha256[change.additionSha256]]};
        requireThat(valueSha256(actual.inclusion_ast)===change.afterInclusionSha256&&same(actual.inclusion_ast,ast),input,'PROFILE_REUSE_AFTER_AST');
        expected={...old,inclusion_ast:ast};
      }else if(kind==='parameters'&&Object.hasOwn(m.sourceProfileMetadataOnlyV1?.inputPresentationOnlyV1?.changes??{},old.parameter_id)){
        const truth=sourceProfileInputPresentationTruthR1(opt,old);
        requireThat(same(actual.truth_metadata,truth),input,'PROFILE_INPUT_PRESENTATION_AFTER_TRUTH_FIELDS');
        expected={...old,truth_metadata:truth};
      }else if(kind==='parameters'&&Object.hasOwn(m.changes,old.parameter_id)){
        const truth=actual.truth_metadata,oldTruth=old.truth_metadata,change=m.changes[old.parameter_id]!;
        requireThat(object(truth)&&valueSha256(truth)===change.afterTruthMetadataSha256
          &&oldTruth.visibility_role==='USER_INPUT'&&truth.visibility_role==='INTERNAL_ONLY'
          &&AUTHORITY_SOURCE_ROLES_R1.has(truth.value_source_role)&&truth.source_confirmation_required===true
          &&object(truth.provenance)&&truth.provenance.consumer_input_role_v1==='APPLICATION_TECHNICAL'
          &&same(omitAuthority(truth,['visibility_role','value_source_role','source_confirmation_required','provenance','guide']),
            omitAuthority(oldTruth,['visibility_role','value_source_role','source_confirmation_required','provenance','guide']))
          &&same(omitAuthority(truth.provenance,['consumer_input_role_v1']),omitAuthority(oldTruth.provenance??{},['consumer_input_role_v1'])),
          input,'AUTHORITY_AFTER_TRUTH_FIELDS');
        requireThat(object(truth.guide)&&object(oldTruth.guide),input,'AUTHORITY_GUIDE_CONSISTENCY');
        if(!same(truth.guide,oldTruth.guide))requireThat(
          same(omitAuthority(truth.guide,['source_role']),omitAuthority(oldTruth.guide,['source_role']))
          &&truth.guide.source_role===truth.value_source_role,input,'AUTHORITY_GUIDE_CONSISTENCY');
        requireThat(!object(truth.guide)||truth.guide.source_role===truth.value_source_role,input,'AUTHORITY_GUIDE_CONSISTENCY');
        expected={...old,truth_metadata:truth};
      }
      const ignored=phase==='REPRESENTATIVE'?[]:['definition_version_id','created_at',
        ...(kind==='parameters'?['approved_template_baseline_id']:[]),...(kind==='resources'?['id','row_sha256']:[])];
      requireThat(same(omitAuthority(expected,ignored),omitAuthority(actual,ignored)),input,'AUTHORITY_'+kind.toUpperCase()+'_DRIFT');
    }
  }
}
function assertTruthAuthorityPlanR1(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1,
  plan:Readonly<{baseline:Json;definition:Json;passport?:Json}>):void{
  const c=opt.capturedParent,m=opt.truthAuthorityOnlyV1!;
  const baselineKeys=['input_values','input_classification','uom_by_parameter','formula_consumer_ids',
    'resource_consumer_row_ids','normative_source_ids','guide_provenance_ru','proposal_source_refs','contract_version'];
  requireThat(baselineKeys.every(k=>same(plan.baseline[k],c.baseline[k])),input,'AUTHORITY_BASELINE_SEMANTICS');
  const expectedApplicability=m.sourceProfileMetadataOnlyV1?{...c.definition.applicability,sourceProfileSelectionV1:m.sourceProfileMetadataOnlyV1.sourceProfileSelectionMetadata}:c.definition.applicability;
  requireThat(same(plan.definition.passport,c.definition.passport)&&same(plan.definition.applicability,expectedApplicability),
    input,'AUTHORITY_DEFINITION_SCOPE');
  const keys=['definition_version_id','release_id','payload_sha256','source_head','source_tree','created_at'];
  requireThat(plan.passport&&same(omitAuthority(plan.passport,keys),omitAuthority(m.capturedContentPassport,keys)),
    input,'AUTHORITY_CONTENT_SCOPE_AND_READINESS');
}
/** Full immutable DB captures reviewed before transferring area-independent
 * physical recipes. These hashes bind definitions, fixtures, sources and rows. */
const REVIEWED_LEGACY_FIXTURE_CAPTURES_R571: Readonly<Record<string,string>> = {
  "canonical-work:base:paving_roads_landscape_interior_asphalt_install_standard": "8219a46940adc5916cfe5d55f7e4c061e0cfa7487f108cee3d55ad76a2ac73a8",
  "canonical-work:base:paving_roads_landscape_interior_asphalt_level_standard": "a96e16ec709c791f0abc2a98d749194d2e348d4ac0cd774825df7f96a1454119",
  "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_standard": "374c7026576f7b0781a3618871abe34000c620d944903a3214ae0401b4bb056d"
};
/** This opt-in is a captured preimage, never caller-supplied replacement history. */
function successorContinuationOf(
  input: MasterRetainedBindingGuardInputR1, opt: MasterRetainParentBindingsR1,
): NonNullable<MasterRetainParentBindingsR1["successorProvenanceContinuation"]> | null {
  if (!Object.hasOwn(opt, "successorProvenanceContinuation")) return null;
  const v = opt.successorProvenanceContinuation;
  requireThat(object(v) && exactKeys(v, ["contract", "capturedSourceMetadata",
    "capturedSourceMetadataSha256", "capturedPreviousSuccessorSha256"])
    && v.contract === "master-retained-binding-continuation/r1",
    input, "CONTINUATION_OPT_IN_OBJECT");
  const metadata = opt.capturedParent.definition.source_metadata;
  requireThat(object(metadata) && Object.hasOwn(metadata, "retainedParentBindingSuccessorV1")
    && object(metadata.retainedParentBindingSuccessorV1), input, "CONTINUATION_OLD_SLOT_REQUIRED");
  // Exact reviewed third continuation for two concrete parents only. All other
  // callers keep the original one-continuation collision and lineage guards.
  if (Object.hasOwn(metadata, 'retainedParentBindingContinuationV1')
    && isMonolithicRepeatedContinuationCandidateR1(opt.capturedParent)) {
    assertMonolithicRepeatedContinuationR1({capture:opt.capturedParent,opt,stopCode:input.config.stopCode});
    return v;
  }
  requireThat(!Object.hasOwn(metadata, "retainedParentBindingContinuationV1"),
    input, "CONTINUATION_SLOT_COLLISION");
  requireThat(object(v.capturedSourceMetadata) && same(v.capturedSourceMetadata, metadata)
    && /^[0-9a-f]{64}$/u.test(v.capturedSourceMetadataSha256)
    && valueSha256(metadata) === v.capturedSourceMetadataSha256,
    input, "CONTINUATION_SOURCE_METADATA_DRIFT");
  const previous = metadata.retainedParentBindingSuccessorV1;
  requireThat(/^[0-9a-f]{64}$/u.test(v.capturedPreviousSuccessorSha256)
    && valueSha256(previous) === v.capturedPreviousSuccessorSha256,
    input, "CONTINUATION_PREVIOUS_SUCCESSOR_DRIFT");
  const direct = typeof previous.parentDefinitionId === "string"
    && typeof previous.parentBaselineId === "string"
    && opt.capturedParent.baseline.source_definition_version_id === previous.parentDefinitionId
    && opt.capturedParent.baseline.supersedes_baseline_id === previous.parentBaselineId;
  requireThat((direct && !isRegisteredForwardDefinition(opt.capturedParent.definition))
    || registeredForwardLineage(opt.capturedParent, opt.capturedParentSha256, same) != null,
    input, "CONTINUATION_OLD_SOURCE_LINEAGE_DRIFT");
  return v;
}
function appendContext(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1){
  return{capture:opt.capturedParent,capturedParentSha256:opt.capturedParentSha256,
    catalogId:input.config.catalogId,stopCode:input.config.stopCode};
}
function successorAppendOf(input:MasterRetainedBindingGuardInputR1,opt:MasterRetainParentBindingsR1):MasterRetainedAppendStateV1|null{
  if(!Object.hasOwn(opt,'successorProvenanceAppendV1'))return null;
  requireThat(!Object.hasOwn(opt,'successorProvenanceContinuation')&&!Object.hasOwn(opt,'operationCompositionOnly'),input,'APPEND_OPTIONS_EXCLUSIVE');
  return validateMasterRetainedBindingAppendV1(appendContext(input,opt),opt.successorProvenanceAppendV1);
}
/** Omission alone preserves the previous route. Present null/undefined/extra
 * keys and zero/extra sources or locators are rejected before any SQL. */
export function masterAdditionalCapturedExistingRegistryV1(input:MasterRetainedBindingGuardInputR1):MasterAdditionalCapturedExistingRegistryV1|null{
 const opt=input.config.binding.retainParentBindings;
 if(!opt||!Object.hasOwn(opt,'additionalCapturedExistingRegistryV1'))return null;
 const a=opt.additionalCapturedExistingRegistryV1;
 requireThat(object(opt.capturedParent)&&object(input.newSource)&&Array.isArray(input.newLocators)
  &&[opt.capturedParent.parameters,opt.capturedParent.resources,opt.capturedParent.normativeSources,opt.capturedParent.normativeLocators].every(x=>Array.isArray(x)&&x.every(object)),input,'ADDITIONAL_EXISTING_PARENT_AND_PRIMARY_SHAPE');
 requireThat(object(a)&&exactKeys(a,['contract','capturedParentSha256','reuse','consumerEmission','capturedRegistryTupleSha256','newParameterIds','rowLocatorIds','rowSourceWitnessByRowId'])
  &&a.contract==='master-one-additional-captured-existing-registry/r1'&&a.capturedParentSha256===opt.capturedParentSha256,input,'ADDITIONAL_EXISTING_DECLARATION');
 requireThat(!Object.hasOwn(opt,'operationCompositionOnly')&&!Object.hasOwn(opt,'truthAuthorityOnlyV1')&&!Object.hasOwn(opt,'monolithicRepairGeometryVisibilityOnlyR60')
  &&!Object.hasOwn(input.config.binding,'reuseExistingNormativeRegistry')&&!Object.hasOwn(input.config,'projectSourcePackagePath')&&input.config.catalogAppend==null,input,'ADDITIONAL_EXISTING_EXCLUSIVE_MODES');
 requireThat(opt.capturedSourcePreimage?.expected===null&&opt.capturedSourcePreimage.sourceKey===input.newSource.source_key
  &&input.newLocators.length===1,input,'ADDITIONAL_EXISTING_ONE_ABSENT_PRIMARY_SOURCE');
 const reuse=a.reuse;
 requireThat(object(reuse)&&exactKeys(reuse,['contract','source','locators','locatorExcerptHashKind','capturedSourceMetadataV1'])
  &&reuse.contract==='master-existing-normative-registry-reuse/r1'&&reuse.locatorExcerptHashKind==='CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1'
  &&object(reuse.source)&&Array.isArray(reuse.locators)&&reuse.locators.length===1&&object(reuse.locators[0]),input,'ADDITIONAL_EXISTING_ONE_TUPLE');
 const source=reuse.source,locator=reuse.locators[0],w=reuse.capturedSourceMetadataV1;
 requireThat(exactKeys(source,['id','source_key','title_ru','authority','official_url','artifact_sha256','effective_from','effective_to','metadata','created_at'])
  &&typeof source.created_at==='string'&&object(source.metadata)&&source.metadata.activationAllowed===false
  &&typeof source.id==='string'&&typeof source.source_key==='string'&&source.source_key.length>0
  &&source.id!==input.newSource.id&&source.source_key!==input.newSource.source_key
  &&!opt.capturedParent.normativeSources.some(s=>s.id===source.id||s.source_key===source.source_key),input,'ADDITIONAL_EXISTING_DISTINCT_IMMUTABLE_SOURCE');
 requireThat(exactKeys(locator,['id','source_id','locator_key','locator','excerpt_sha256'])&&locator.source_id===source.id
  &&typeof locator.id==='string'&&typeof locator.locator_key==='string'&&object(locator.locator)
  &&!input.newLocators.some(l=>l.id===locator.id||l.locator_key===locator.locator_key)
  &&!opt.capturedParent.normativeLocators.some(l=>l.id===locator.id||l.locator_key===locator.locator_key)
  &&locator.excerpt_sha256===masterRetainedLineageValueSha256V1(locator.locator),input,'ADDITIONAL_EXISTING_LOCATOR_IDENTITY');
 requireThat(object(w)&&exactKeys(w,['contract','sourceId','nativeSourceId','sourceKey','artifactSha256','sourceRowSha256','metadataSha256','locatorSetSha256','generatedMetadataSha256'])
  &&w.contract==='master-existing-registry-captured-source-metadata/v1'&&w.sourceId===source.id&&w.sourceKey===source.source_key
  &&w.nativeSourceId===source.metadata.sourceId&&w.artifactSha256===source.artifact_sha256
  &&w.sourceRowSha256===masterRetainedLineageValueSha256V1(source)&&w.metadataSha256===masterRetainedLineageValueSha256V1(source.metadata)
  &&w.locatorSetSha256===masterRetainedLineageValueSha256V1(records(reuse.locators))
  &&a.capturedRegistryTupleSha256===masterRetainedLineageValueSha256V1({source,locators:reuse.locators}),input,'ADDITIONAL_EXISTING_FULL_CAPTURED_WITNESS');
 const emission=a.consumerEmission,m=emission?.sourceMetadata;
 requireThat(object(emission)&&exactKeys(emission,['contract','sourceMetadata'])&&typeof emission.contract==='string'&&emission.contract.length>0&&object(m)
  &&exactKeys(m,['source_title','source_authority','exact_locator','use_restriction','source_kind','official_url','artifact_sha256',...(Object.hasOwn(m,'effective_from')?['effective_from']:[])])
  &&m.source_title===source.title_ru&&m.source_authority===source.authority&&(m.official_url??null)===source.official_url
  &&m.artifact_sha256===source.artifact_sha256&&(m.effective_from??null)===source.effective_from&&source.effective_to===null,input,'ADDITIONAL_EXISTING_EMISSION_FACTS');
 const generatedMetadata={contract:emission.contract,sourceKind:m.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:m.use_restriction,
  universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false};
 requireThat(w.generatedMetadataSha256===masterRetainedLineageValueSha256V1(generatedMetadata),input,'ADDITIONAL_EXISTING_GENERATED_CONSUMER_METADATA');
 requireThat(Array.isArray(a.newParameterIds)&&a.newParameterIds.length>0&&a.newParameterIds.length<=16
  &&a.newParameterIds.every(id=>typeof id==='string'&&id.length>0&&!opt.capturedParent.parameters.some(p=>p.parameter_id===id))
  &&new Set(a.newParameterIds).size===a.newParameterIds.length,input,'ADDITIONAL_EXISTING_PARAMETER_SCOPE');
 requireThat(object(a.rowLocatorIds)&&object(a.rowSourceWitnessByRowId)&&Object.keys(a.rowLocatorIds).length>0&&Object.keys(a.rowLocatorIds).length<=32
  &&exactKeys(a.rowSourceWitnessByRowId,Object.keys(a.rowLocatorIds))&&Object.entries(a.rowLocatorIds).every(([id,lid])=>id.length>0&&lid===locator.id
   &&!opt.capturedParent.resources.some(r=>r.row_id===id)),input,'ADDITIONAL_EXISTING_ROW_MAP');
 for(const witness of Object.values(a.rowSourceWitnessByRowId))requireThat(object(witness)&&exactKeys(witness,['sourceMetadataSha256','formulaValueSha256','physicalPaymentValueSha256'])
  &&Object.values(witness).every(x=>typeof x==='string'&&/^[0-9a-f]{64}$/u.test(x)),input,'ADDITIONAL_EXISTING_ROW_WITNESS');
 requireThat(Buffer.byteLength(encoded(a))<=1048576,input,'ADDITIONAL_EXISTING_CAPTURE_BYTE_CAP');return a;
}
function assertAdditionalExistingComputationV1(input:MasterRetainedBindingGuardInputR1,next:Computation):void{
 const a=masterAdditionalCapturedExistingRegistryV1(input);if(!a)return;const opt=input.config.binding.retainParentBindings!,source=a.reuse.source;
 requireThat(Array.isArray(next.parameters)&&Array.isArray(next.formulas)&&Array.isArray(next.resources)
  &&[...next.parameters,...next.formulas,...next.resources].every(object),input,'ADDITIONAL_EXISTING_NEXT_COMPUTATION_SHAPE');
 for(const[id,w]of Object.entries(a.rowSourceWitnessByRowId)){
  const r=next.resources.find(r=>r.row_id===id),f=r&&next.formulas.find(f=>f.formula_id===r.formula_id);
  requireThat(r&&f&&w.sourceMetadataSha256===masterRetainedLineageValueSha256V1(r.source_metadata)
   &&w.physicalPaymentValueSha256===masterRetainedLineageValueSha256V1(paymentValue(r))
   &&w.formulaValueSha256===masterRetainedLineageValueSha256V1({formula_id:f.formula_id,expression_source:f.expression_source,ast:f.ast,input_parameter_ids:f.input_parameter_ids}),input,'ADDITIONAL_EXISTING_ROW_PHYSICAL_SOURCE_DRIFT');
 }
 const old=new Set(opt.capturedParent.parameters.map(p=>p.parameter_id));
 for(const q of next.parameters.filter(p=>!old.has(p.parameter_id))){const spec=opt.newParameterSources[q.parameter_id],external=a.newParameterIds.includes(q.parameter_id);
  requireThat(object(spec)&&Array.isArray(spec.sourceIds)&&(external?spec.kind==='KNOWN'&&same(spec.sourceIds,[source.source_key]):!spec.sourceIds.includes(source.source_key)),input,'ADDITIONAL_EXISTING_PARAMETER_SOURCE_MAP');}
 requireThat(a.newParameterIds.every(id=>next.parameters.some(p=>p.parameter_id===id)),input,'ADDITIONAL_EXISTING_PARAMETER_MISSING');
}
function assertAdditionalExistingBindingsV1(input:MasterRetainedBindingGuardInputR1,bindings:readonly Json[]):void{
 const a=masterAdditionalCapturedExistingRegistryV1(input);if(!a)return;const primary=new Set(input.newLocators.map(l=>l.id));
 requireThat(Array.isArray(bindings)&&bindings.every(object),input,'ADDITIONAL_EXISTING_BINDING_ARRAY_REQUIRED');
 requireThat(Object.entries(a.rowLocatorIds).every(([id,lid])=>bindings.filter(b=>b.row_id===id).length===1
  &&bindings.some(b=>b.row_id===id&&b.locator_id===lid))&&bindings.every(b=>Object.hasOwn(a.rowLocatorIds,b.row_id)
   ?a.rowLocatorIds[b.row_id]===b.locator_id:primary.has(b.locator_id)),input,'ADDITIONAL_EXISTING_BINDING_MAP_OMIT_EXTRA_OR_WRONG_SOURCE');
}
function assertAdditionalExistingSnapshotV1(input:MasterRetainedBindingGuardInputR1,actual:MasterRetainedBindingSnapshotR1):void{
 const a=masterAdditionalCapturedExistingRegistryV1(input);
 if(!a){requireThat(!Object.hasOwn(actual,'additionalCapturedExistingRegistryV1'),input,'ADDITIONAL_EXISTING_SNAPSHOT_WITHOUT_OPTIN');return;}
 const v=actual.additionalCapturedExistingRegistryV1;
 requireThat(object(v)&&exactKeys(v,['sources','locators','sourceRawRows','locatorRawRows','metadataRoundTrip'])
  &&Array.isArray(v.sources)&&Array.isArray(v.locators)&&v.sources.every(object)&&v.locators.every(object)
  &&same(v.sources,[a.reuse.source])&&same(records(v.locators),records(a.reuse.locators))&&v.metadataRoundTrip===true
  &&Array.isArray(v.sourceRawRows)&&v.sourceRawRows.length===1&&Array.isArray(v.locatorRawRows)&&v.locatorRawRows.length===1,input,'ADDITIONAL_EXISTING_ACTUAL_SNAPSHOT_REQUIRED');
 for(const[raw,expected]of [[v.sourceRawRows[0],a.reuse.source],[v.locatorRawRows[0],a.reuse.locators[0]]]as const){
  requireThat(typeof raw==='string'&&Buffer.byteLength(raw)<=1048576,input,'ADDITIONAL_EXISTING_FULL_RAW_REQUIRED');
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{fail(input,'ADDITIONAL_EXISTING_FULL_RAW_JSON');}
  requireThat(same(parsed,expected),input,'ADDITIONAL_EXISTING_RAW_OBJECT_DRIFT');
 }
}

/** An omitted property is the ONLY fallback. Present undefined/null is not omission. */
export function masterRetainParentBindingsOptInR1(
  input: MasterRetainedBindingGuardInputR1,
): MasterRetainParentBindingsR1 | null {
  if (!Object.prototype.hasOwnProperty.call(input.config.binding, "retainParentBindings")) return null;
  const value = input.config.binding.retainParentBindings;
  requireThat(object(value), input, "OPT_IN_OBJECT_REQUIRED");
  requireThat(input.config.catalogAppend == null, input, "REPLACE_ONLY");
  requireThat(object(value.capturedParent) && typeof value.capturedParentSha256 === "string"
    && /^[0-9a-f]{64}$/u.test(value.capturedParentSha256), input, "CAPTURE_REQUIRED");
  const c = value.capturedParent;
  requireThat(object(c.definition) && object(c.baseline) && [c.parameters, c.formulas, c.resources, c.bindings,
    c.normativeSources, c.normativeLocators].every(Array.isArray), input, "CAPTURE_SHAPE");
  requireThat(masterRetainedParentCaptureSha256R1(c) === value.capturedParentSha256,
    input, "CAPTURE_SHA256");
  requireThat(c.definition.catalog_id === input.config.catalogId
    && /^[0-9a-f]{64}$/u.test(c.definition.definition_sha256)
    && c.baseline.catalog_id === input.config.catalogId
    && c.baseline.definition_version_id === c.definition.id, input, "CAPTURE_ANCHOR");
  const unique = (rows: readonly Json[], key: (row: Json) => string, suffix: string) => {
    requireThat(rows.every(object), input, suffix);
    const keys = rows.map(key);
    requireThat(keys.every(k => k.length > 0) && new Set(keys).size === keys.length, input, suffix);
  };
  unique(c.parameters, p => String(p.parameter_id ?? ""), "CAPTURE_PARAMETERS");
  unique(c.formulas, f => String(f.formula_id ?? ""), "CAPTURE_FORMULA_IDS");
  unique(c.resources, r => String(r.id ?? ""), "CAPTURE_RESOURCE_IDS");
  unique(c.resources, r => String(r.row_id ?? ""), "CAPTURE_ROW_IDS");
  unique(c.bindings, b => `${b.resource_spec_id}/${b.locator_id}`, "CAPTURE_BINDING_DUPLICATES");
  unique(c.normativeSources, s => String(s.id ?? ""), "CAPTURE_SOURCE_IDS");
  unique(c.normativeSources, s => String(s.source_key ?? ""), "CAPTURE_SOURCE_KEYS");
  unique(c.normativeLocators, l => String(l.id ?? ""), "CAPTURE_LOCATOR_IDS");
  const resources = new Set(c.resources.map(r => r.id));
  const formulas = new Set(c.formulas.map(f => f.formula_id));
  const locators = new Map(c.normativeLocators.map(l => [l.id, l]));
  const sources = new Set(c.normativeSources.map(s => s.id));
  requireThat(c.parameters.every(p => p.definition_version_id === c.definition.id)
    && c.formulas.every(f => f.definition_version_id === c.definition.id)
    && c.resources.every(r => r.definition_version_id === c.definition.id && formulas.has(r.formula_id))
    && c.bindings.every(b => b.definition_version_id === c.definition.id && resources.has(b.resource_spec_id)
      && locators.has(b.locator_id) && object(b.applicability))
    && c.normativeLocators.every(l => sources.has(l.source_id)), input, "CAPTURE_REFERENCE_CLOSURE");
  requireThat(object(c.baseline.normative_source_ids)
    && (approvedTemplateSourceEvidenceOf(input,value)?approvedBaselineSourceKeysMatch(c,value.capturedParentSha256):exactKeys(c.baseline.normative_source_ids, c.parameters.map(p => p.parameter_id))),
    input, "CAPTURE_BASELINE_SOURCE_KEYS");
  if(Object.hasOwn(value,'projectScopeMetadataOnlyV1')){
    assertProjectScopeMetadataDeclarationInRetainedR1(input,value);
    return value;
  }
  const operationOnly=value.operationCompositionOnly;
  const authorityOnly=value.truthAuthorityOnlyV1;
  const repairVisibilityOnly=value.monolithicRepairGeometryVisibilityOnlyR60;
  if(Object.hasOwn(value,'monolithicRepairGeometryVisibilityOnlyR60')){
    requireThat(exactKeys(value,['capturedParent','capturedParentSha256','newParameterSources','monolithicRepairGeometryVisibilityOnlyR60','successorProvenanceAppendV1'])
      &&same(value.newParameterSources,{}),input,'REPAIR_VISIBILITY_EXCLUSIVE_DECLARATION');
    assertMasterMonolithicRepairGeometryVisibilityDeclarationR60({catalogId:input.config.catalogId,stopCode:input.config.stopCode,
      capture:c,captureSha256:value.capturedParentSha256},repairVisibilityOnly!);
    const reuse=input.config.binding.reuseExistingNormativeRegistry;
    requireThat(object(reuse)&&reuse.contract==='master-existing-normative-registry-reuse/r1'
      &&object(reuse.source)&&same(c.normativeSources.find(s=>s.id===reuse.source.id),reuse.source)
      &&same(input.newSource,omitAuthority(reuse.source,['created_at']))
      &&Array.isArray(reuse.locators)&&same(records(reuse.locators),records(input.newLocators))
      &&same(records(input.newLocators),records(c.normativeLocators.filter(l=>l.source_id===input.newSource.id))),
      input,'REPAIR_VISIBILITY_EXISTING_REGISTRY_CAPTURE');
  }
  if(Object.hasOwn(value,'truthAuthorityOnlyV1'))assertTruthAuthorityDeclarationR1(input,value);
  if(Object.hasOwn(value,'operationCompositionOnly')){
    assertMasterOperationCompositionDeclarationR1({catalogId:input.config.catalogId,capture:c,
      captureSha256:value.capturedParentSha256,mode:operationOnly!,newParameterSources:value.newParameterSources});
    requireThat(!Object.hasOwn(value,'monolithicRepairGeometryVisibilityOnlyR60')&&!Object.hasOwn(value,'legacyTemplateAssumptionSources')&&!Object.hasOwn(value,'successorProvenanceContinuation')&&!Object.hasOwn(value,'successorProvenanceAppendV1')
      &&!Object.hasOwn(value,'formulaExpressionRepairs')&&!Object.hasOwn(value,'capturedSourcePreimage'),input,'OPERATION_ONLY_EXCLUSIVE');
  }
  const sourceKeys = c.normativeSources.map(s => s.source_key);
  const baselineSources = Object.values(c.baseline.normative_source_ids);
  const legacy = value.legacyTemplateAssumptionSources;
  if (Object.hasOwn(value, 'legacyTemplateAssumptionSources')) {
    requireThat(object(legacy) && exactKeys(legacy,['contract','templateId','parameterSources',
      ...(Object.hasOwn(legacy,'approvedTemplatePredecessor')?['approvedTemplatePredecessor']:[]),
      ...(Object.hasOwn(legacy,'approvedSourceEvidence')?['approvedSourceEvidence']:[])])
      && legacy.contract === 'master-retained-legacy-template-assumptions/r1'
      && typeof legacy.templateId === 'string' && legacy.templateId.length > 0
      && legacy.templateId === c.definition.source_metadata?.templateId
      && object(legacy.parameterSources) && Object.keys(legacy.parameterSources).length > 0
      && Object.keys(legacy.parameterSources).length <= 16, input, 'LEGACY_TEMPLATE_ASSUMPTION_DECLARATION');
    let approvedCapture=c;
    if(Object.hasOwn(legacy,'approvedTemplatePredecessor')){
      const continuation=successorAppendOf(input,value)??successorContinuationOf(input,value),predecessor=legacy.approvedTemplatePredecessor;
      requireThat(continuation!=null&&object(predecessor)
        &&exactKeys(predecessor,['capturedParent','capturedParentSha256'])
        &&object(predecessor.capturedParent)&&typeof predecessor.capturedParentSha256==='string',
        input,'LEGACY_TEMPLATE_ASSUMPTION_PREDECESSOR_DECLARATION');
      const original=predecessor.capturedParent,previous=c.definition.source_metadata.retainedParentBindingSuccessorV1;
      requireThat(masterRetainedParentCaptureSha256R1(original)===predecessor.capturedParentSha256
        &&predecessor.capturedParentSha256===previous.capturedParentSha256
        &&original.definition.id===previous.parentDefinitionId&&original.baseline.id===previous.parentBaselineId
        &&original.definition.catalog_id===c.definition.catalog_id
        &&!Object.hasOwn(original.definition.source_metadata,'retainedParentBindingSuccessorV1')
        &&!Object.hasOwn(original.definition.source_metadata,'retainedParentBindingContinuationV1'),
        input,'LEGACY_TEMPLATE_ASSUMPTION_PREDECESSOR_ANCHOR');
      // Re-run the original strict admission. Only one frozen original edge is
      // permitted, so this cannot become recursive caller-defined provenance.
      const {approvedTemplatePredecessor:_original,...originalLegacy}=legacy;
      masterRetainParentBindingsOptInR1({...input,config:{...input.config,parentReleaseId:original.definition.release_id,
        binding:{retainParentBindings:{capturedParent:original,capturedParentSha256:predecessor.capturedParentSha256,
          newParameterSources:{},legacyTemplateAssumptionSources:originalLegacy}}}});
      approvedCapture=original;
    }
    const sourceEvidence=approvedTemplateSourceEvidenceOf(input,value,approvedCapture);
    const approvedConsumers=sourceEvidence?buildMasterParameterCalculationConsumers(c):null;
    for (const [parameterId, declared] of Object.entries(legacy.parameterSources)) {
      const p = c.parameters.find(p => p.parameter_id === parameterId);
      const binding = p?.truth_metadata?.provenance?.approvedTemplateBinding;
      const approvedParameter=approvedCapture.parameters.find(p=>p.parameter_id===parameterId);
      const connected = c.formulas.filter(f => Array.isArray(f.input_parameter_ids) && f.input_parameter_ids.includes(parameterId));
      requireThat(p != null && same(declared, ['r555-source:' + legacy.templateId])
        && !sourceKeys.includes(declared[0]!) && same(c.baseline.normative_source_ids[parameterId], declared)
        && c.baseline.input_classification?.[parameterId] === 'ASSUMPTION'
        && p.truth_metadata?.visibility_role === 'USER_INPUT'
        && p.truth_metadata?.value_source_role === 'VISIBLE_BASELINE_ASSUMPTION'
        && object(binding) && binding.catalogId === c.definition.catalog_id
        && typeof approvedCapture.baseline.source_definition_version_id === 'string'
        && binding.definitionVersionId === approvedCapture.baseline.source_definition_version_id && binding.baselineId === approvedCapture.baseline.id
        && approvedParameter!=null&&same(binding,approvedParameter.truth_metadata?.provenance?.approvedTemplateBinding)
        &&p.unit_id===approvedParameter.unit_id&&p.value_type===approvedParameter.value_type
        &&same(c.baseline.input_values?.[parameterId],approvedCapture.baseline.input_values?.[parameterId])
        &&same(c.baseline.normative_source_ids[parameterId],approvedCapture.baseline.normative_source_ids[parameterId])
        &&c.baseline.input_classification?.[parameterId]===approvedCapture.baseline.input_classification?.[parameterId]
        && binding.parameterId === parameterId && binding.inputClassification === 'ASSUMPTION'
        && (sourceEvidence?approvedSourceBindingMatches(approvedCapture,sourceEvidence,p,binding,c.baseline.id):binding.sourceTree === c.definition.source_metadata.sourceTree)
        && same(binding.value, c.baseline.input_values?.[parameterId])
        && same(binding.normativeSourceIds, declared)
        && Array.isArray(binding.formulaConsumerIds) && Array.isArray(binding.resourceConsumerRowIds)
        && same(setOf(binding.formulaConsumerIds),setOf(connected.map(f=>f.formula_id)))
        && same(setOf(binding.resourceConsumerRowIds),setOf(approvedConsumers?.resourceConsumers[parameterId]??c.resources.filter(r=>connected.some(f=>f.formula_id===r.formula_id)).map(r=>r.row_id))),
        input, 'LEGACY_TEMPLATE_ASSUMPTION_EXACT_APPROVED_INPUT');
    }
  }
  const fixture = value.legacyCapturedFixtureSources;
  if (Object.hasOwn(value, "legacyCapturedFixtureSources")) {
    requireThat(!Object.hasOwn(value,"legacyTemplateAssumptionSources") && object(fixture)
      && exactKeys(fixture,["contract","parameterSources"])
      && fixture.contract === "master-retained-captured-fixture-provenance/r1"
      && object(fixture.parameterSources)
      && (operationOnly!=null||(REVIEWED_LEGACY_FIXTURE_CAPTURES_R571[c.definition.catalog_id] === value.capturedParentSha256
      && c.definition.source_metadata?.contract === "rik-expo-app.r4-a13-6.asphalt-source-ownership-successor.v3")),
      input,"LEGACY_CAPTURED_FIXTURE_EXACT_REVIEWED_PARENT");
    const missing=Object.fromEntries(Object.entries(c.baseline.normative_source_ids).map(([id,v])=>
      [id,(v as string[]).filter(key=>!sourceKeys.includes(key))]).filter(([,keys])=>(keys as string[]).length>0));
    requireThat(same(fixture.parameterSources,missing) && Object.entries(missing).every(([id,keys])=>
      ["VALIDATION_FIXTURE","DERIVED"].includes(c.baseline.input_classification?.[id])
      && (keys as string[]).every(key=>["project_quantity_inputs_v3","selected_material_or_product_passport_v1",
        "selected_equipment_passport_v1"].includes(key))),input,"LEGACY_CAPTURED_FIXTURE_SOURCE_MAP");
  }
  requireThat(Object.entries(c.baseline.normative_source_ids).every(([parameterId,v]) => Array.isArray(v)
    && v.every(s => sourceKeys.includes(s) || legacy?.parameterSources?.[parameterId]?.includes(s)
      || fixture?.parameterSources?.[parameterId]?.includes(s))
    && new Set(v).size === v.length), input, "CAPTURE_BASELINE_SOURCE_CLOSURE");
  const referencedLocators = setOf(c.bindings.map(b => String(b.locator_id)));
  requireThat(same(referencedLocators, c.normativeLocators.map(l => String(l.id)).sort()),
    input, "CAPTURE_LOCATOR_CLOSURE");
  const referencedSources = setOf([
    ...c.normativeLocators.map(l => String(l.source_id)),
    ...c.normativeSources.filter(s => baselineSources.some(ids => (ids as string[]).includes(s.source_key)))
      .map(s => String(s.id)),
  ]);
  requireThat(same(referencedSources, c.normativeSources.map(s => String(s.id)).sort()),
    input, "CAPTURE_SOURCE_CLOSURE");
  requireThat(object(value.newParameterSources), input, "NEW_PARAMETER_SOURCE_MAP_REQUIRED");
  requireThat(object(input.newSource) && exactKeys(input.newSource, ["id", "source_key", "title_ru",
    "authority", "official_url", "artifact_sha256", "effective_from", "effective_to", "metadata"])
    && object(input.newSource.metadata) && typeof input.newSource.id === "string"
    && typeof input.newSource.source_key === "string" && input.newSource.source_key.length > 0
    && (operationOnly!=null||authorityOnly!=null||repairVisibilityOnly!=null
      ? same(input.newSource,Object.fromEntries(Object.entries(c.normativeSources.find(s=>s.id===input.newSource.id)??{}).filter(([key])=>key!=='created_at')))
      : !sources.has(input.newSource.id) && !sourceKeys.includes(input.newSource.source_key)),
    input, "NEW_SOURCE_MUST_BE_DISTINCT_COMPLETE_ROW");
  requireThat(Array.isArray(input.newLocators) && input.newLocators.length > 0
    && input.newLocators.every(l => object(l) && exactKeys(l,
      ["id", "source_id", "locator_key", "locator", "excerpt_sha256"])
      && l.source_id === input.newSource.id && object(l.locator)
      && (operationOnly!=null||authorityOnly!=null||repairVisibilityOnly!=null?same(l,locators.get(l.id)):!locators.has(l.id))),
    input, "NEW_LOCATOR_DISTINCT_COMPLETE_ROWS");
  if(operationOnly!=null)requireThat(Object.hasOwn(input.config.binding,'reuseExistingNormativeRegistry')
    &&same(records(input.newLocators),records(c.normativeLocators.filter(l=>l.source_id===input.newSource.id))),input,'OPERATION_ONLY_EXISTING_REGISTRY');
  unique(input.newLocators, l => String(l.id ?? ""), "NEW_LOCATOR_IDS");
  unique(input.newLocators, l => String(l.locator_key ?? ""), "NEW_LOCATOR_KEYS");
  if (Object.hasOwn(value, "capturedSourcePreimage")) {
    const preimage = value.capturedSourcePreimage;
    requireThat(object(preimage) && exactKeys(preimage, ["sourceKey", "expected"])
      && preimage.sourceKey === input.newSource.source_key && preimage.expected === null,
    input, "CAPTURED_SOURCE_PREIMAGE_INVALID");
    requireThat(!Object.hasOwn(input.config.binding, "reuseExistingNormativeRegistry"),
      input, "CAPTURED_SOURCE_PREIMAGE_REUSE_CONFLICT");
  }
  if (Object.hasOwn(value, "formulaExpressionRepairs")) {
    const repairs = value.formulaExpressionRepairs;
    requireThat(object(repairs) && Object.keys(repairs).length > 0
      && Object.keys(repairs).length <= c.formulas.length, input, "FORMULA_EXPRESSION_REPAIR_MAP");
    const oldById = new Map(c.formulas.map(f => [f.formula_id, f]));
    const parameterIds = new Set(c.parameters.map(p => p.parameter_id));
    for (const [id, repair] of Object.entries(repairs)) {
      const old = oldById.get(id);
      requireThat(old != null && object(repair)
        && exactKeys(repair, ["capturedExpressionSource", "correctedExpressionSource"])
        && typeof old.expression_source === "string"
        && repair.capturedExpressionSource === old.expression_source
        && typeof repair.correctedExpressionSource === "string"
        && repair.correctedExpressionSource.trim().length > 0
        && repair.correctedExpressionSource.length <= 16384
        && repair.correctedExpressionSource !== old.expression_source,
        input, "FORMULA_EXPRESSION_REPAIR_DECLARATION");
      requireThat(object(old.ast) && Array.isArray(old.input_parameter_ids)
        && old.input_parameter_ids.every((p: unknown) => typeof p === "string" && parameterIds.has(p))
        && new Set(old.input_parameter_ids).size === old.input_parameter_ids.length
        && old.ast_sha256 === createHash("sha256").update(encoded(old.ast)).digest("hex"),
        input, "FORMULA_EXPRESSION_REPAIR_OLD_WITNESS");
      try {
        const corrected = compileFormulaGraph(repair.correctedExpressionSource);
        requireThat(same(corrected.ast, old.ast)
          && same([...corrected.inputParameterIds].sort(), [...old.input_parameter_ids].sort()),
          input, "FORMULA_EXPRESSION_REPAIR_SEMANTICS");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith(`STOP_${input.config.stopCode}_RETAIN_`)) throw error;
        fail(input, "FORMULA_EXPRESSION_REPAIR_COMPILE");
      }
      let oldIsConsistent = false;
      try {
        const original = compileFormulaGraph(old.expression_source);
        oldIsConsistent = same(original.ast, old.ast)
          && same([...original.inputParameterIds].sort(), [...old.input_parameter_ids].sort());
      } catch { fail(input, "FORMULA_EXPRESSION_REPAIR_OLD_COMPILE"); }
      requireThat(!oldIsConsistent, input, "FORMULA_EXPRESSION_REPAIR_UNNECESSARY");
    }
  }
  if(Object.hasOwn(value,'successorProvenanceAppendV1'))successorAppendOf(input,value);
  else successorContinuationOf(input, value);
  masterAdditionalCapturedExistingRegistryV1(input);
  return value;
}
function required(input: MasterRetainedBindingGuardInputR1): MasterRetainParentBindingsR1 {
  const opt = masterRetainParentBindingsOptInR1(input);
  requireThat(opt != null, input, "EXPLICIT_OPT_IN_REQUIRED"); return opt;
}
/** Call this at normal preflight, and again immediately after table locks before DML. */
export function assertMasterRetainedBindingSnapshotR1(
  input: MasterRetainedBindingGuardInputR1, actual: MasterRetainedBindingSnapshotR1,
  phase: "BEFORE" | "REGISTERED" = "BEFORE",
): void {
  const retained = required(input), c = retained.capturedParent;
  assertAdditionalExistingSnapshotV1(input,actual);
  const approvedSource=approvedTemplateSourceEvidenceOf(input,required(input));
  if(approvedSource)requireThat(record(actual.legacyApprovedSourceDefinition)
    &&same(actual.legacyApprovedSourceDefinition,approvedSource.capturedSourceDefinition),input,'APPROVED_SOURCE_DEFINITION_DRIFT');
  requireThat(same(actual.membership, [{release_id: input.config.parentReleaseId,
    catalog_id: input.config.catalogId, definition_version_id: c.definition.id,
    approved_template_baseline_id: c.baseline.id, definition_hash: c.definition.definition_sha256}]),
    input, "MANIFEST_ANCHOR_DRIFT");
  requireThat(same(captureValue(actual.capture), captureValue(c)), input, "PARENT_FULL_CAPTURE_DRIFT");
  const forwarding = registeredForwardLineage(c, retained.capturedParentSha256, same);
  requireThat(forwarding == null
    ? !Object.hasOwn(actual, "retainedForwardLineage")
    : Array.isArray(actual.retainedForwardLineage) && same(records(actual.retainedForwardLineage), records(forwarding)),
    input, "CONTINUATION_REGISTERED_FORWARD_LINEAGE_DRIFT");
  if(retained.projectScopeMetadataOnlyV1)requireThat(same(actual.contentPassport,retained.projectScopeMetadataOnlyV1.capturedContentPassport),input,'SCOPE_METADATA_CONTENT_PASSPORT_DRIFT');
  if(retained.operationCompositionOnly)requireThat(same(actual.contentPassport,retained.operationCompositionOnly.capturedContentPassport),input,'OPERATION_ONLY_CONTENT_PASSPORT_DRIFT');
  if(retained.truthAuthorityOnlyV1)requireThat(object(actual.contentPassport)&&same(actual.contentPassport,retained.truthAuthorityOnlyV1.capturedContentPassport),input,'AUTHORITY_CONTENT_PASSPORT_DRIFT');
  if(retained.monolithicRepairGeometryVisibilityOnlyR60)requireThat(object(actual.contentPassport)&&same(actual.contentPassport,retained.monolithicRepairGeometryVisibilityOnlyR60.capturedContentPassport),input,'REPAIR_VISIBILITY_CONTENT_PASSPORT_DRIFT');
  requireThat(Array.isArray(actual.newSources) && actual.newSources.length <= 1,
    input, "NEW_SOURCE_ID_OR_KEY_COLLISION");
  if (actual.newSources.length === 1) {
    const {created_at: _serverTimestamp, ...managed} = actual.newSources[0];
    requireThat(same(managed, input.newSource), input, "NEW_SOURCE_NOT_EXACT");
  }
  requireThat(Array.isArray(actual.newLocators), input, "NEW_LOCATOR_SNAPSHOT_REQUIRED");
  requireThat(actual.newSources.length === 1 || actual.newLocators.length === 0,
    input, "NEW_LOCATOR_WITHOUT_SOURCE");
  const newById = new Map(input.newLocators.map(l => [l.id, l]));
  const observedIds = new Set<string>();
  for (const locator of actual.newLocators) {
    requireThat(newById.has(locator.id) && !observedIds.has(locator.id)
      && same(locator, newById.get(locator.id)), input, "NEW_LOCATOR_NOT_EXACT");
    observedIds.add(locator.id);
  }
  if (Object.hasOwn(retained, "capturedSourcePreimage")) {
    assertMasterSingleDefinitionCapturedSourcePreimageR1(
      {stopCode: input.config.stopCode + "_RETAIN", sourceId: input.newSource.source_key},
      retained.capturedSourcePreimage, actual.newSources[0] ?? null, phase,
    );
    // BEFORE already requires [] locators when source[]; REGISTERED requires the
    // full exact declared closure, not only one exact source or a locator subset.
    if (phase === "REGISTERED") requireThat(actual.newLocators.length === input.newLocators.length,
      input, "CAPTURED_SOURCE_PREIMAGE_REGISTERED_LOCATOR_CLOSURE");
  }
}
export function assertMasterRetainedBindingPreflightUnchangedR1(
  input: MasterRetainedBindingGuardInputR1, before: MasterRetainedBindingSnapshotR1,
  locked: MasterRetainedBindingSnapshotR1,
): void {
  assertMasterRetainedBindingSnapshotR1(input, before);
  assertMasterRetainedBindingSnapshotR1(input, locked);
  const value = (s: MasterRetainedBindingSnapshotR1) => ({membership: records(s.membership),
    capture: captureValue(s.capture), newSources: records(s.newSources), newLocators: records(s.newLocators),
    ...(s.additionalCapturedExistingRegistryV1?{additionalCapturedExistingRegistryV1:s.additionalCapturedExistingRegistryV1}:{}),...(s.contentPassport?{contentPassport:s.contentPassport}:{}),
    ...(s.retainedForwardLineage?{retainedForwardLineage:records(s.retainedForwardLineage)}:{}),
    ...(s.legacyApprovedSourceDefinition?{legacyApprovedSourceDefinition:s.legacyApprovedSourceDefinition}:{})});
  requireThat(same(value(before), value(locked)), input, "PREFLIGHT_CHANGED_BEFORE_DML");
}
/** No writes. Table locks, not advisory/row locks alone, exclude a phantom19th/9th binding. */
export async function lockMasterRetainedBindingPreconditionsR1(
  client: QueryClient, input: MasterRetainedBindingGuardInputR1,
): Promise<void> {
  const c = required(input).capturedParent;
  const isolation = await client.query("show transaction_isolation");
  requireThat(isolation.rows[0]?.transaction_isolation === "read committed", input,
    "LOCKED_REREAD_REQUIRES_READ_COMMITTED");
  const keys = setOf([`definition:${c.definition.id}`, `source-key:${input.newSource.source_key}`,
    ...c.normativeSources.map(s => `source-key:${s.source_key}`),
    ...(masterAdditionalCapturedExistingRegistryV1(input)?(()=>{const a=masterAdditionalCapturedExistingRegistryV1(input)!;return[`source-key:${a.reuse.source.source_key}`,`source-id:${a.reuse.source.id}`,`locator-id:${a.reuse.locators[0].id}`];})():[]),
    ...Object.values(required(input).legacyTemplateAssumptionSources?.parameterSources ?? {}).flat().map(s=>`source-key:${s}`),
    ...Object.values(required(input).legacyCapturedFixtureSources?.parameterSources ?? {}).flat().map(s=>`source-key:${s}`)]);
  await lockMasterRetainedTablesR1(client,keys);
  if(required(input).operationCompositionOnly||required(input).projectScopeMetadataOnlyV1)await client.query(`lock table public.estimate_content_passport_r3,
    public.estimate_search_document,public.estimate_search_index_release in share row exclusive mode`);
}
/** The new continuation cannot claim complete previous metadata if a JS parse
 * rounded any PG JSONB numeric lexeme. Compare exact PG canonical TEXT to the
 * exact serialized captured object in PG; returning only a bounded boolean.
 * Existing omitted legacy continuation has no additional query. */
export async function assertMasterRetainedContinuationMetadataRoundTripR1(
  client: QueryClient, input: MasterRetainedBindingGuardInputR1,
): Promise<void> {
  const opt = required(input), append=successorAppendOf(input,opt),continuation = append==null?successorContinuationOf(input, opt):null;
  const approvedSource=approvedTemplateSourceEvidenceOf(input,opt);
  if (continuation == null&&append==null&&!opt.operationCompositionOnly&&!opt.projectScopeMetadataOnlyV1&&approvedSource==null) return;
  const expectedJson = JSON.stringify(append?.metadata??continuation?.capturedSourceMetadata??opt.capturedParent.definition.source_metadata);
  requireThat(Buffer.byteLength(expectedJson) <= 512 * 1024,
    input, "CONTINUATION_SOURCE_METADATA_BYTE_CAP");
  const result = await client.query(`select (octet_length(source_metadata::text)<=524288
    and source_metadata::text=($1::jsonb)::text) matches
    from public.estimate_definition_version where id=$2::uuid and catalog_id=$3`,
    [expectedJson, opt.capturedParent.definition.id, input.config.catalogId]);
  requireThat(result.rows.length === 1 && result.rows[0]?.matches === true,
    input, "CONTINUATION_SOURCE_METADATA_LOSSLESS_ROUND_TRIP_REQUIRED");
  if(approvedSource){
    const source=approvedSource.capturedSourceDefinition,metadata=JSON.stringify(source.source_metadata);
    requireThat(Buffer.byteLength(metadata)<=512*1024,input,'APPROVED_SOURCE_METADATA_BYTE_CAP');
    const observed=await client.query(`select (octet_length(source_metadata::text)<=524288
      and source_metadata::text=($1::jsonb)::text) matches
      from public.estimate_definition_version where id=$2::uuid and catalog_id=$3`,[metadata,source.id,input.config.catalogId]);
    requireThat(observed.rows.length===1&&observed.rows[0]?.matches===true,input,'APPROVED_SOURCE_METADATA_LOSSLESS_ROUND_TRIP_REQUIRED');
  }
}
/** An existing source can own other operations. Reuse checks the exact selected
 * locators by both ID and source/key; a new source still requires its full closure. */
function retainedExistingLocatorScopeKeysR1(input: MasterRetainedBindingGuardInputR1): string[] | null {
  if (!Object.hasOwn(input.config.binding,"reuseExistingNormativeRegistry")) return null;
  const reuse=input.config.binding.reuseExistingNormativeRegistry;
  requireThat(object(reuse) && reuse.contract==="master-existing-normative-registry-reuse/r1"
    && object(reuse.source) && typeof reuse.source.created_at==="string"
    && Array.isArray(reuse.locators) && reuse.locators.length>0
    && same(records(reuse.locators),records(input.newLocators)),input,"EXISTING_LOCATOR_SCOPE_EXACT_DECLARATION");
  const {created_at:_timestamp,...managed}=reuse.source;
  requireThat(same(managed,input.newSource),input,"EXISTING_LOCATOR_SCOPE_EXACT_SOURCE");
  return input.newLocators.map(locator=>String(locator.locator_key));
}
/** Raw row_to_json text prevents PG Date conversion from changing captured microseconds. */
export async function readMasterRetainedBindingPreconditionsR1(
  client: QueryClient, input: MasterRetainedBindingGuardInputR1,
  phase: "BEFORE" | "REGISTERED" = "BEFORE",
): Promise<MasterRetainedBindingSnapshotR1> {
  const opt = required(input), c = opt.capturedParent;
  await assertMasterRetainedContinuationMetadataRoundTripR1(client, input);
  const read = async (sql: string, values: unknown[], cap: number): Promise<Json[]> => {
    const result = await client.query(sql, values);
    requireThat(result.rows.length <= cap, input, "READ_CAP");
    return result.rows.map(row => {
      requireThat(typeof row.raw === "string", input, "RAW_JSON_REQUIRED");
      const parsed: unknown = JSON.parse(row.raw);
      requireThat(object(parsed), input, "RAW_OBJECT_REQUIRED"); return parsed;
    });
  };
  const approvedSource=approvedTemplateSourceEvidenceOf(input,opt);
  const approvedRows=approvedSource?await read(`select row_to_json(t)::text raw from (
    select * from public.estimate_definition_version where id=$1 and catalog_id=$2 limit 2)t`,
    [approvedSource.capturedSourceDefinition.id,input.config.catalogId],1):[];
  if(approvedSource)requireThat(approvedRows.length===1,input,'APPROVED_SOURCE_DEFINITION_MISSING');
  const membership = await read(`select row_to_json(t)::text raw from (
    select release_id,catalog_id,definition_version_id,approved_template_baseline_id,definition_hash
    from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2 limit 2)t`,
    [input.config.parentReleaseId, input.config.catalogId], 1);
  const full = async (table: string, predicate: string, values: unknown[], cap: number) =>
    read(masterRetainedFullRowSqlR1(table,predicate,cap),values,cap);
  const definition = await full("estimate_definition_version", "id=$1", [c.definition.id], 1);
  const baseline = await full("estimate_approved_template_baseline", "id=$1 and definition_version_id=$2",
    [c.baseline.id, c.definition.id], 1);
  requireThat(definition.length === 1 && baseline.length === 1, input, "PARENT_MISSING");
  const parameters = await full("estimate_parameter_definition", "definition_version_id=$1",
    [c.definition.id], c.parameters.length);
  const formulas = await full("estimate_formula_graph", "definition_version_id=$1",
    [c.definition.id], c.formulas.length);
  const resources = await full("estimate_resource_spec", "definition_version_id=$1",
    [c.definition.id], c.resources.length);
  const bindings = await full("estimate_work_normative_binding", "definition_version_id=$1",
    [c.definition.id], c.bindings.length);
  const normativeLocators = await full("estimate_normative_locator", `id=any($1::uuid[]) or id in (
    select locator_id from public.estimate_work_normative_binding where definition_version_id=$2)`,
    [c.normativeLocators.map(l => l.id), c.definition.id], c.normativeLocators.length);
  const normativeSources = await full("estimate_normative_source", `id=any($1::uuid[])
    or source_key=any($2::text[]) or id in (select source_id from public.estimate_normative_locator
      where id in(select locator_id from public.estimate_work_normative_binding where definition_version_id=$3))`,
    [c.normativeSources.map(s => s.id), setOf([...c.normativeSources.map(s => s.source_key),
      ...Object.values(opt.legacyTemplateAssumptionSources?.parameterSources ?? {}).flat(),
      ...Object.values(opt.legacyCapturedFixtureSources?.parameterSources ?? {}).flat()]), c.definition.id], c.normativeSources.length);
  const newSources = await full("estimate_normative_source", "id=$1 or source_key=$2",
    [input.newSource.id, input.newSource.source_key], 1);
  const existingLocatorKeys=retainedExistingLocatorScopeKeysR1(input);
  const newLocators = await full("estimate_normative_locator", existingLocatorKeys==null
    ? "id=any($1::uuid[]) or source_id=$2"
    : "id=any($1::uuid[]) or (source_id=$2 and locator_key=any($3::text[]))",
    [input.newLocators.map(l => l.id), input.newSource.id,...(existingLocatorKeys==null?[]:[existingLocatorKeys])], input.newLocators.length);
  const contentPassports=opt.operationCompositionOnly||opt.projectScopeMetadataOnlyV1||opt.truthAuthorityOnlyV1||opt.monolithicRepairGeometryVisibilityOnlyR60?await full('estimate_content_passport_r3','definition_version_id=$1',[c.definition.id],1):[];
  if(opt.projectScopeMetadataOnlyV1)requireThat(contentPassports.length===1,input,'SCOPE_METADATA_PASSPORT_REQUIRED');
  if(opt.operationCompositionOnly)requireThat(contentPassports.length===1,input,'OPERATION_ONLY_PASSPORT_REQUIRED');
  if(opt.truthAuthorityOnlyV1)requireThat(contentPassports.length===1,input,'AUTHORITY_PASSPORT_REQUIRED');
  if(opt.monolithicRepairGeometryVisibilityOnlyR60)requireThat(contentPassports.length===1,input,'REPAIR_VISIBILITY_PASSPORT_REQUIRED');
  const forwarding = registeredForwardLineage(c, opt.capturedParentSha256, same);
  const observedForwarding: Json[] = [];
  for (const node of forwarding ?? []) {
    const definitions = await full("estimate_definition_version", "id=$1 and catalog_id=$2",
      [node.definition.id, input.config.catalogId], 1);
    const baselines = await full("estimate_approved_template_baseline", "id=$1 and definition_version_id=$2 and catalog_id=$3",
      [node.baseline.id, node.definition.id, input.config.catalogId], 1);
    requireThat(definitions.length === 1 && baselines.length === 1,
      input, "CONTINUATION_REGISTERED_FORWARD_NODE_MISSING");
    observedForwarding.push({definition: definitions[0], baseline: baselines[0]});
  }
  // Only this opt-in adds reads; raw text and PG JSONB roundtrip are kept
  // separately. Existing primary newSources/newLocators queries stay exact.
  const additional=masterAdditionalCapturedExistingRegistryV1(input);
  let additionalSnapshot:MasterAdditionalCapturedExistingRegistrySnapshotV1|undefined;
  if(additional){const source=additional.reuse.source,locator=additional.reuse.locators[0];
    const zone=await client.query("select current_setting('TimeZone') timezone");
    requireThat(zone.rows.length===1&&zone.rows[0]?.timezone==='UTC',input,'ADDITIONAL_EXISTING_UTC_REQUIRED');
    const sr=await client.query(`select case when octet_length(metadata::text)<=524288
      and octet_length(row_to_json(t)::text)<=1048576 then row_to_json(t)::text else null end raw,
      (octet_length(metadata::text)<=524288 and metadata::text=($3::jsonb)::text) matches from
      (select * from public.estimate_normative_source where id=$1::uuid or source_key=$2 limit 2)t`,[source.id,source.source_key,JSON.stringify(source.metadata)]);
    const lr=await client.query(`select case when octet_length(locator::text)<=524288
      and octet_length(row_to_json(t)::text)<=1048576 then row_to_json(t)::text else null end raw,
      (octet_length(locator::text)<=524288 and locator::text=($4::jsonb)::text) matches from
      (select * from public.estimate_normative_locator where id=$1::uuid or (source_id=$2::uuid and locator_key=$3) limit 2)t`,[locator.id,source.id,locator.locator_key,JSON.stringify(locator.locator)]);
    requireThat(sr.rows.length===1&&lr.rows.length===1&&sr.rows[0]?.matches===true&&lr.rows[0]?.matches===true
      &&typeof sr.rows[0]?.raw==='string'&&typeof lr.rows[0]?.raw==='string',input,'ADDITIONAL_EXISTING_RAW_OVERFLOW_OR_ROUNDTRIP');
    additionalSnapshot={sources:[JSON.parse(sr.rows[0].raw)],locators:[JSON.parse(lr.rows[0].raw)],
      sourceRawRows:[sr.rows[0].raw],locatorRawRows:[lr.rows[0].raw],metadataRoundTrip:true};
  }
  const snapshot = {...(additionalSnapshot?{additionalCapturedExistingRegistryV1:additionalSnapshot}:{}),...(approvedSource?{legacyApprovedSourceDefinition:approvedRows[0]}:{}),...(forwarding?{retainedForwardLineage:observedForwarding}:{}),...(opt.operationCompositionOnly||opt.projectScopeMetadataOnlyV1||opt.truthAuthorityOnlyV1||opt.monolithicRepairGeometryVisibilityOnlyR60?{contentPassport:contentPassports[0]}:{}),membership, capture: {definition: definition[0], baseline: baseline[0], parameters, formulas,
    resources, bindings, normativeSources, normativeLocators}, newSources, newLocators};
  assertMasterRetainedBindingSnapshotR1(input, snapshot, phase); return snapshot;
}
type Computation = Readonly<{
  parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[];
}>;
function formulaValue(row: Json, phase: "REPRESENTATIVE" | "PLAN"): Json {
  if (phase === "REPRESENTATIVE") return normalized(row);
  // Only the new definition FK and DB-created timestamp may differ on clone.
  const {definition_version_id: _definition, created_at: _created, ...semantic} = row;
  return semantic;
}
function paymentValue(row: Json): Json {
  return Object.fromEntries(["unit_id", "formula_id", "category", "row_type", "cost_owner_id",
    "semantic_owner", "procurement_eligible", "source_metadata"].map(key => [key, row[key]]).concat([
      ["resource_graph.costTreatment", row.resource_graph?.costTreatment],
    ]));
}
/** A retained locator must remain attached to the SAME physical arithmetic,
 * unit, owner and payment. Gates/input refs may grow; they are not a new norm. */
export function assertMasterRetainedParentComputationR1(
  input: MasterRetainedBindingGuardInputR1, next: Computation,
  phase: "REPRESENTATIVE" | "PLAN",
): void {
  const opt = required(input), c = opt.capturedParent;
  if(opt.projectScopeMetadataOnlyV1){assertProjectScopeMetadataComputationR1(input,opt,next,phase);return;}
  if(opt.operationCompositionOnly){assertMasterOperationCompositionComputationR1(c,opt.operationCompositionOnly,next,phase);return;}
  if(opt.truthAuthorityOnlyV1){assertTruthAuthorityComputationR1(input,opt,next,phase);return;}
  if(opt.monolithicRepairGeometryVisibilityOnlyR60){assertMasterMonolithicRepairGeometryVisibilityComputationR60({catalogId:input.config.catalogId,stopCode:input.config.stopCode,capture:c,captureSha256:opt.capturedParentSha256},opt.monolithicRepairGeometryVisibilityOnlyR60,next,phase);return;}
  requireThat(Array.isArray(next.formulas), input, "NEXT_FORMULAS_REQUIRED");
  assertAdditionalExistingComputationV1(input,next);
  const formulaIds = next.formulas.map(f => f.formula_id);
  requireThat(formulaIds.every(id => typeof id === "string" && id.length > 0)
    && new Set(formulaIds).size === formulaIds.length, input, "NEXT_FORMULA_IDS");
  const formulas = new Map(next.formulas.map(f => [f.formula_id, f]));
  const legacyAssumptions = Object.keys(opt.legacyTemplateAssumptionSources?.parameterSources ?? {});
  if (legacyAssumptions.length) {
    const capturedFormulas = new Set(c.formulas.map(f=>f.formula_id));
    requireThat(next.formulas.filter(f=>!capturedFormulas.has(f.formula_id)).every(f=>
      Array.isArray(f.input_parameter_ids) && !f.input_parameter_ids.some((id:string)=>legacyAssumptions.includes(id))),
      input,'LEGACY_TEMPLATE_ASSUMPTION_NOT_A_NEW_QUANTITY_NORM');
  }
  const fixtureInputs=Object.keys(opt.legacyCapturedFixtureSources?.parameterSources ?? {});
  if(fixtureInputs.length){
    const oldFormulas=new Set(c.formulas.map(f=>f.formula_id)),oldRows=new Set(c.resources.map(r=>r.row_id));
    const consumesFixture=(f:Json|undefined)=>f!=null && Array.isArray(f.input_parameter_ids)
      && f.input_parameter_ids.some((id:string)=>fixtureInputs.includes(id));
    requireThat(next.formulas.filter(f=>!oldFormulas.has(f.formula_id)).every(f=>!consumesFixture(f))
      && next.resources.filter(r=>!oldRows.has(r.row_id)).every(r=>!consumesFixture(formulas.get(r.formula_id))),
      input,"LEGACY_CAPTURED_FIXTURE_NOT_A_NEW_QUANTITY_NORM");
  }
  for (const old of c.formulas) {
    const actual = formulas.get(old.formula_id);
    const repair = opt.formulaExpressionRepairs?.[old.formula_id];
    const expected = repair == null ? old : {...old, expression_source: repair.correctedExpressionSource};
    requireThat(actual != null && same(formulaValue(expected, phase), formulaValue(actual, phase)),
      input, "OLD_FORMULA_SEMANTICS_DRIFT");
  }
  requireThat(Array.isArray(next.resources) && Array.isArray(next.parameters), input, "NEXT_COMPUTATION_REQUIRED");
  const rows = next.resources.map(r => r.row_id);
  requireThat(new Set(rows).size === rows.length, input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
  const byRow = new Map(next.resources.map(r => [r.row_id, r]));
  const oldRows = new Set(c.resources.map(r => r.row_id));
  const bound = new Set(c.bindings.map(b => b.resource_spec_id));
  const parameterIds = new Set(next.parameters.map(p => p.parameter_id));
  for (const old of c.resources) {
    const actual = byRow.get(old.row_id);
    requireThat(actual != null, input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
    // Snapshot UUIDs are immutable. A representative retains them; the shared
    // clone publisher allocates NEW physical UUIDs but keeps every logical row_id.
    if (phase === "REPRESENTATIVE") requireThat(actual.id === old.id,
      input, "OLD_REPRESENTATIVE_RESOURCE_ID_DRIFT");
    requireThat(formulas.has(actual.formula_id), input, "RESOURCE_FORMULA_MISSING");
    if (bound.has(old.id)) {
      requireThat(same(paymentValue(old), paymentValue(actual)), input, "OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT");
    } else if (!object(actual.source_metadata) || !same(old.source_metadata, actual.source_metadata)) {
      // The existing ELECOR APPLICATION need may gain explicit method evidence;
      // it does not gain a locator, source norm, paid quantity or migrated price.
      const metadata = actual.source_metadata;
      const evidence = metadata?.completionNeedTransitionV1;
      const owner = byRow.get(evidence?.resolvedThroughPaidOwnerRowId);
      requireThat(old.source_metadata?.sourceRole === "UNRESOLVED_APPLICATION_NORM"
        && object(metadata) && object(evidence)
        && typeof evidence.featureContract === "string" && evidence.featureContract.length > 0
        && parameterIds.has(evidence.selectedMethodParameterId)
        && typeof evidence.resolvedOnlyForMethod === "string" && evidence.resolvedOnlyForMethod.length > 0
        && evidence.automaticLegacyPriceOrQuantityTransferAllowed === false
        && owner != null && !oldRows.has(owner.row_id)
        && owner.resource_graph?.costTreatment === "OWN_COST",
        input, "OLD_UNBOUND_NEED_COMPLETION_EVIDENCE_REQUIRED");
      const {completionNeedTransitionV1: _transition, ...rest} = metadata;
      requireThat(!Object.hasOwn(old.source_metadata, "completionNeedTransitionV1")
        && same(rest, old.source_metadata), input, "OLD_UNBOUND_NEED_PROVENANCE_DRIFT");
    }
  }
}
type ExplicitSourceAssemblyInput = Readonly<{
  /** Existing retained caller uses its historical STOP_*_RETAIN_ prefix. */
  errorPrefix: string;
  parameters: readonly Json[];
  newParameterSources: unknown;
  sourceClosure: readonly string[];
  oldResourceRowIds: readonly string[];
  next: Computation;
}>;
function sourceRequire(value: unknown, input: ExplicitSourceAssemblyInput, suffix: string): asserts value {
  if (!value) throw new Error(input.errorPrefix + suffix);
}
/** Empty [] is an output marker, never a fictitious external normative source.
 * It is admitted only for a real, reciprocal compiler control on a NEW row. */
function assertEmptyDerivedSourceControl(
  input: ExplicitSourceAssemblyInput, parameter: Json,
): void {
  const sources = input.newParameterSources as Json;
  const spec = sources[parameter.parameter_id];
  const meta = parameter.truth_metadata?.effective_resource_quantity_v1;
  const oldRows = new Set(input.oldResourceRowIds);
  const next = input.next;
  const owner = next.resources.find(r => r.row_id === meta?.sourceRowId);
  sourceRequire(spec?.kind === "DERIVED" && Array.isArray(spec.sourceIds) && spec.sourceIds.length === 0
    && parameter.truth_metadata?.value_source_role === "COMPILER_DERIVED_RESOURCE_QUANTITY"
    && parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY"
    && object(meta) && exactKeys(meta, ["sourceRowId", "unitId"])
    && typeof meta.sourceRowId === "string" && !oldRows.has(meta.sourceRowId)
    && owner != null && typeof parameter.unit_id === "string" && parameter.unit_id.length > 0
    && meta.unitId === parameter.unit_id && owner.unit_id === parameter.unit_id,
    input, "EMPTY_DERIVED_CONTROL_INVALID");
  try {
    // SAME canonical definition-integrity validator; no arithmetic/quantity engine.
    const controls = planCanonicalEffectiveResourceQuantitiesV1(
      next.parameters as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[0],
      next.resources as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[1],
      next.formulas as unknown as Parameters<typeof planCanonicalEffectiveResourceQuantitiesV1>[2]);
    sourceRequire(controls.outputs.get(meta.sourceRowId)?.parameterId === parameter.parameter_id,
      input, "EMPTY_DERIVED_CONTROL_INVALID");
  } catch {
    throw new Error(input.errorPrefix + "EMPTY_DERIVED_CONTROL_INVALID");
  }
}
/** One pure map validator/assembler shared by retained replacement and explicit
 * append. It returns only new arrays; captured historical arrays stay untouched. */
export function assembleMasterExplicitParameterSourcesR1(input: ExplicitSourceAssemblyInput): Json {
  const sources = input.newParameterSources;
  sourceRequire(object(sources), input, "NEW_PARAMETER_SOURCE_MAP_REQUIRED");
  sourceRequire(exactKeys(sources, input.parameters.map(p => p.parameter_id)),
    input, "NEW_PARAMETER_SOURCE_EXACT_KEYS");
  const result: Json = {};
  for (const p of input.parameters) {
    const spec = sources[p.parameter_id];
    sourceRequire(object(spec) && ["KNOWN", "DERIVED", "UNRESOLVED"].includes(spec.kind)
      && Array.isArray(spec.sourceIds) && spec.sourceIds.every(s => typeof s === "string"
        && input.sourceClosure.includes(s)) && new Set(spec.sourceIds).size === spec.sourceIds.length,
      input, "NEW_PARAMETER_SOURCE_VALUE");
    const role = p.truth_metadata?.value_source_role;
    sourceRequire(typeof role === "string" && role.length > 0, input, "NEW_PARAMETER_TRUTH_ROLE_REQUIRED");
    const unresolved = role === "UNRESOLVED_APPLICATION_NORM";
    sourceRequire((spec.kind === "UNRESOLVED") === unresolved, input, "NEW_UNRESOLVED_KIND_MISMATCH");
    if (unresolved) sourceRequire(spec.sourceIds.length === 0, input, "NEW_UNRESOLVED_SOURCE_FORBIDDEN");
    else {
      sourceRequire((spec.kind === "DERIVED") === role.includes("DERIVED"), input, "NEW_DERIVED_KIND_MISMATCH");
      if (spec.sourceIds.length === 0) {
        sourceRequire(spec.kind === "DERIVED", input, "NEW_KNOWN_SOURCE_REQUIRED");
        assertEmptyDerivedSourceControl(input, p);
      }
    }
    result[p.parameter_id] = [...spec.sourceIds];
  }
  return result;
}
/** Keep the retained plan guard's existing call site and error prefix. */
function assertMasterNewEmptyDerivedControlR1(
  input: MasterRetainedBindingGuardInputR1, parameter: Json, next: Computation,
): void {
  const opt = required(input);
  assertEmptyDerivedSourceControl({errorPrefix: `STOP_${input.config.stopCode}_RETAIN_`, parameters: [parameter],
    newParameterSources: opt.newParameterSources, sourceClosure: [],
    oldResourceRowIds: opt.capturedParent.resources.map(r => r.row_id), next}, parameter);
}

/** Pure representative assembly. Existing clone publisher remains the ONLY writer. */
export function prepareMasterRetainedBindingRepresentativeR1(
  input: MasterRetainedBindingGuardInputR1,
  next: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]; newBindings: readonly Json[];
    successorProvenance: Json; lifecycleMetadata?: Json}>,
): Readonly<{bindings: readonly Json[]; normativeSourceIds: Json; sourceMetadata: Json;
  expectedNormativeBindingCount: number; normativeSourceClosure: readonly string[]}> {
  const opt = required(input), c = opt.capturedParent;
  assertMasterRetainedParentComputationR1(input, next, "REPRESENTATIVE");
  if(opt.truthAuthorityOnlyV1)requireThat(same(next.successorProvenance.truthAuthorityOnlyV1,{
    contract:opt.truthAuthorityOnlyV1.contract,changesSha256:opt.truthAuthorityOnlyV1.changesSha256,
    parameterIds:Object.keys(opt.truthAuthorityOnlyV1.changes).sort(),
    ...(opt.truthAuthorityOnlyV1.sourceProfileMetadataOnlyV1?{sourceProfileMetadataOnlyV1:masterRetainedSourceProfileMetadataCompactR1(opt.truthAuthorityOnlyV1)}:{})}),input,'AUTHORITY_COMPACT_SUCCESSOR_DECLARATION');
  if(opt.monolithicRepairGeometryVisibilityOnlyR60)requireThat(same(next.successorProvenance.monolithicRepairGeometryVisibilityOnlyR60,
    masterMonolithicRepairGeometryVisibilityCompactR60(opt.monolithicRepairGeometryVisibilityOnlyR60)),input,'REPAIR_VISIBILITY_COMPACT_SUCCESSOR_DECLARATION');
  if(opt.projectScopeMetadataOnlyV1)return projectScopeMetadataRepresentativeR1(input,opt,next);
  if(opt.operationCompositionOnly){
    requireThat(Array.isArray(next.newBindings)&&next.newBindings.length===0,input,'OPERATION_ONLY_NO_NEW_BINDINGS');
    return masterOperationCompositionRepresentativeR1(c,opt.operationCompositionOnly,next.successorProvenance);
  }
  const oldResourceIds = new Map(c.resources.map(r => [r.id, r.row_id]));
  const oldRows = new Set(c.resources.map(r => r.row_id));
  const nextRows = next.resources.map(r => r.row_id);
  requireThat(nextRows.every(id => typeof id === "string" && id.length > 0)
    && new Set(nextRows).size === nextRows.length
    && [...oldRows].every(id => nextRows.includes(id)), input, "OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");
  const auxiliary=masterAdditionalCapturedExistingRegistryV1(input);
  const locators = new Set([...input.newLocators.map(l => l.id),...(auxiliary?auxiliary.reuse.locators.map((l:Json)=>l.id):[])]);
  assertAdditionalExistingBindingsV1(input,next.newBindings);
  requireThat(Array.isArray(next.newBindings) && ((opt.truthAuthorityOnlyV1||opt.monolithicRepairGeometryVisibilityOnlyR60)?next.newBindings.length===0:next.newBindings.length > 0)
    && next.newBindings.every(b => typeof b.row_id === "string" && nextRows.includes(b.row_id)
      && !oldRows.has(b.row_id) && locators.has(b.locator_id) && object(b.applicability)),
    input, "NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE");
  const keys = next.newBindings.map(b => `${b.row_id}/${b.locator_id}`);
  requireThat(new Set(keys).size === keys.length, input, "NEW_BINDING_DUPLICATE");
  const oldBindings = c.bindings.map(b => ({row_id: oldResourceIds.get(b.resource_spec_id),
    locator_id: b.locator_id, applicability: normalized(b.applicability)}));
  const oldParamIds = new Set(c.parameters.map(p => p.parameter_id));
  const nextParamIds = next.parameters.map(p => p.parameter_id);
  requireThat(nextParamIds.every(id => typeof id === "string" && id.length > 0)
    && new Set(nextParamIds).size === nextParamIds.length
    && [...oldParamIds].every(id => nextParamIds.includes(id)), input, "OLD_PARAMETER_REMOVED_OR_NEXT_DUPLICATE");
  const newParameters = next.parameters.filter(p => !oldParamIds.has(p.parameter_id));
  const sourceClosure = setOf([...c.normativeSources.map(s => s.source_key), input.newSource.source_key,...(auxiliary?[auxiliary.reuse.source.source_key]:[])]);
  // Historical old unresolved slots may have old source arrays: preserve them EXACTLY.
  // Only newly introduced unresolved slots are required to have []. Do not rewrite history.
  const normativeSourceIds = {...normalized(c.baseline.normative_source_ids),
    ...assembleMasterExplicitParameterSourcesR1({errorPrefix: `STOP_${input.config.stopCode}_RETAIN_`,
      parameters: newParameters, newParameterSources: opt.newParameterSources, sourceClosure,
      oldResourceRowIds: c.resources.map(r => r.row_id), next})};
  const oldMetadata = c.definition.source_metadata;
  const append=successorAppendOf(input,opt),continuation = append==null?successorContinuationOf(input, opt):null;
  requireThat(object(oldMetadata) && object(next.successorProvenance)
    && (append!=null || continuation != null || !Object.prototype.hasOwnProperty.call(oldMetadata, "retainedParentBindingSuccessorV1")),
    input, "SUCCESSOR_PROVENANCE_SLOT_COLLISION");
  const lifecycle = next.lifecycleMetadata ?? {};
  requireThat(object(lifecycle) && Object.keys(lifecycle).every(key =>
    ["contract", "masterSha256", "sourceFingerprint"].includes(key)), input, "LIFECYCLE_OVERWRITE_KEYS");
  if (continuation != null) requireThat(
    (!Object.hasOwn(next.successorProvenance, "catalogId")
      || next.successorProvenance.catalogId === input.config.catalogId)
    && next.successorProvenance.parentDefinitionId === c.definition.id
    && next.successorProvenance.parentBaselineId === c.baseline.id
    && next.successorProvenance.capturedParentSha256 === opt.capturedParentSha256,
    input, "CONTINUATION_CURRENT_PARENT_ANCHOR");
  const sourceMetadata = append==null?{...normalized(oldMetadata), ...normalized(lifecycle),
    ...(continuation == null
      ? {retainedParentBindingSuccessorV1: normalized(next.successorProvenance)}
      : {[(Object.hasOwn(oldMetadata, 'retainedParentBindingContinuationV1')
        && isMonolithicRepeatedContinuationCandidateR1(c))
        ? MONOLITHIC_REPEAT_CONTINUATION_KEY_R1 : 'retainedParentBindingContinuationV1']: {
        contract: continuation.contract,
        previousSourceMetadata: normalized(continuation.capturedSourceMetadata),
        previousSourceMetadataSha256: continuation.capturedSourceMetadataSha256,
        previousSuccessorSha256: continuation.capturedPreviousSuccessorSha256,
        successor: {...normalized(next.successorProvenance), catalogId: input.config.catalogId},
      }})}:appendMasterRetainedBindingLineageV1(appendContext(input,opt),append,next.successorProvenance,lifecycle);
  return {bindings: [...oldBindings, ...next.newBindings.map(b => normalized(b))],
    normativeSourceIds, sourceMetadata,
    expectedNormativeBindingCount: oldBindings.length + next.newBindings.length,
    normativeSourceClosure: sourceClosure};
}
/** Final plan check: run before publisher preflight, and reuse for independent readback. */
export function assertMasterRetainedBindingPlanR1(
  input: MasterRetainedBindingGuardInputR1,
  plan: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]; bindings: readonly Json[]; baseline: Json; definition: Json; passport?: Json}>,
  expected: ReturnType<typeof prepareMasterRetainedBindingRepresentativeR1>,
): void {
  const opt = required(input);
  assertMasterRetainedParentComputationR1(input, plan, "PLAN");
  if(opt.projectScopeMetadataOnlyV1)assertProjectScopeMetadataPlanR1(input,opt,plan);
  if(opt.operationCompositionOnly)assertMasterOperationCompositionPlanR1(opt.capturedParent,opt.operationCompositionOnly,plan);
  if(opt.truthAuthorityOnlyV1)assertTruthAuthorityPlanR1(input,opt,plan);
  if(opt.monolithicRepairGeometryVisibilityOnlyR60){const c=opt.capturedParent;assertMasterMonolithicRepairGeometryVisibilityPlanR60({catalogId:input.config.catalogId,stopCode:input.config.stopCode,capture:c,captureSha256:opt.capturedParentSha256},opt.monolithicRepairGeometryVisibilityOnlyR60,plan);}
  for (const p of plan.parameters) {
    const spec = opt.newParameterSources[p.parameter_id];
    if (spec?.kind === "DERIVED" && Array.isArray(spec.sourceIds) && spec.sourceIds.length === 0) {
      assertMasterNewEmptyDerivedControlR1(input, p, plan);
    }
  }
  const idToRow = new Map(plan.resources.map(r => [r.id, r.row_id]));
  const semantics = plan.bindings.map(b => ({row_id: idToRow.get(b.resource_spec_id),
    locator_id: b.locator_id, applicability: b.applicability}));
  requireThat(same(records(semantics), records(expected.bindings)), input, "PLAN_FULL_BINDING_SET_DRIFT");
  requireThat(same(plan.baseline.normative_source_ids, expected.normativeSourceIds),
    input, "PLAN_BASELINE_SOURCE_ARRAYS_DRIFT");
  requireThat(same(plan.definition.source_metadata, expected.sourceMetadata),
    input, "PLAN_TOP_PROVENANCE_DRIFT");
}

function masterRetainedFullRowSqlR1(table:string,predicate:string,cap:number):string{
 return `select row_to_json(t)::text raw from (select * from public.${table}
      where ${predicate} limit ${cap + 1})t`;
}
export const MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1=Object.freeze({"release_id":"01417cef-3091-5012-844d-1bbd9e75cee1","catalog_id":"canonical-work:master:monolithic_reinforced_concrete_wall_standard","definition_version_id":"17c7db90-0c2d-523b-a673-ae1b47ebfebc","approved_template_baseline_id":"4fbfec74-7195-50fc-9c72-5ace39c73f76","definition_hash":"64ca2993df836e098c5b316eb051637aee272ecff52c7ab306f9ffad122c4d67"});
export function assertMonolithicWallCurrentMembershipR1(member:unknown):void{
 if(!member||typeof member!=='object'||Array.isArray(member))throw Error('MONOLITHIC_WALL_CURRENT_MEMBERSHIP_REQUIRED');
 for(const [key,value] of Object.entries(MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1)){
  if(!Object.hasOwn(member,key)||Reflect.get(member,key)!==value)throw Error('MONOLITHIC_WALL_CURRENT_MEMBERSHIP_DRIFT');
 }
}

/** Exact numeric/header proof in the current RR snapshot; no body is projected. */
export const MONOLITHIC_WALL_INVENTORY_IDENTITY_SQL_R1=`with fixed_wall_inventory_identity as materialized (
 select definition_version_id,approved_template_baseline_id,definition_hash from public.estimate_cumulative_manifest_entry where release_id=$1::uuid and catalog_id=$2 limit 2),
 inventory_definition as materialized(select id,catalog_id,definition_sha256 from public.estimate_definition_version where id=$3::uuid and catalog_id=$2 limit 2),
 inventory_baseline as materialized(select id,definition_version_id,catalog_id from public.estimate_approved_template_baseline where id=$4::uuid and definition_version_id=$3::uuid and catalog_id=$2 limit 2)
 select (select count(*)::int from fixed_wall_inventory_identity) membership_count,
 (select coalesce(bool_and(definition_version_id=$3::uuid and approved_template_baseline_id=$4::uuid and definition_hash=$5),false) from fixed_wall_inventory_identity) membership_exact,
 (select count(*)::int from inventory_definition) definition_count,
 (select coalesce(bool_and(id=$3::uuid and catalog_id=$2 and definition_sha256=$5),false) from inventory_definition) definition_exact,
 (select count(*)::int from inventory_baseline) baseline_count,
 (select coalesce(bool_and(id=$4::uuid and definition_version_id=$3::uuid and catalog_id=$2),false) from inventory_baseline) baseline_exact`;
export async function inventoryMasterMonolithicWallCurrentBytesR1(client:QueryClient,absoluteDeadlineUtc:string){
 const expected=MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1,start=performance.now(),end=Date.parse(absoluteDeadlineUtc);
 const need=(value:unknown,code:string):void=>{if(!value)throw Error('ELECTRICAL_CURRENT_'+code);};
 const time=()=>need(Number.isFinite(end)&&Date.now()<end&&performance.now()-start<=12000,'READ_DEADLINE');
 time();const session=(await client.query("select current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone")).rows;time();
 need(session.length===1&&session[0]!.isolation==='repeatable read'&&session[0]!.read_only==='on'&&session[0]!.timezone==='UTC','READ_ONLY_RR_UTC_REQUIRED');
 const identityRows=(await client.query(MONOLITHIC_WALL_INVENTORY_IDENTITY_SQL_R1,[expected.release_id,expected.catalog_id,expected.definition_version_id,expected.approved_template_baseline_id,expected.definition_hash])).rows;time();
 need(identityRows.length===1,'NUMERIC_INVENTORY_IDENTITY');
 const identity=identityRows[0],fields=['membership_count','membership_exact','definition_count','definition_exact','baseline_count','baseline_exact'];
 need(identity!==null&&typeof identity==='object'&&Object.keys(identity).sort().join(',')===[...fields].sort().join(','),'NUMERIC_INVENTORY_IDENTITY');
 for(const field of fields){const d=Object.getOwnPropertyDescriptor(identity,field);need(d&&Object.hasOwn(d,'value')&&d.value===(field.endsWith('_count')?1:true),'NUMERIC_INVENTORY_IDENTITY');}
 // Constants become eligible only after the actual SQL equality/count proof above.
 const read=createMasterAtomicRawReadR1(client,{config:{stopCode:'ELECTRICAL_CURRENT'}},time,{kind:'FIXED_WALL_NUMERIC_INVENTORY_R1',membership:expected});
 const collections:Array<Record<string,number|string|boolean>>=[];
 for(const item of MASTER_WALL_NUMERIC_INVENTORY_R1){
  const profile:MasterFixedWallBaselineProfileR1|undefined=item.collection==='baseline'?{kind:'FIXED_MONOLITHIC_WALL_BASELINE_2M_R1',membership:expected}:undefined;
  const rows=await read(masterRetainedFullRowSqlR1(item.table,item.predicate,item.cap),"json_build_object('raw',raw)",[...item.args],item.cap,item.collection,profile);time();
  need(rows.length===1,'NUMERIC_INVENTORY_DIAGNOSIS');collections.push(rows[0]!);
 }
 need(collections.length===11,'NUMERIC_INVENTORY_DIAGNOSIS');
 return{contract:'fixed-wall-eleven-numeric-inventory/r1',expectedMembership:expected,actualIdentityEqualityVerified:true,
  identityProof:{membershipCount:1,membershipExact:true,definitionCount:1,definitionExact:true,baselineCount:1,baselineExact:true},
  collections,totalWouldWireBytes:collections[10]!.cumulativeAfter,cumulativeBudget:3145728,
  completeScopeSizeKnown:collections.every(v=>v.completeCollection===true),fullCaptureWouldFit:collections.every(v=>v.completeCollection===true&&v.wouldFitRaw===true&&v.wouldFitWire===true&&v.wouldFitCumulative===true),
  rawPayloadReturned:false,currentFullParentVerified:false,normalLockedFullGuardSatisfied:false,sourceAdmission:false,full:false};
}
export type FixedElectricalCurrentCatalogR1=
 'canonical-work:base:electrical_interior_lighting_install_technical_room'|
 'canonical-work:base:electrical_interior_socket_install_standard';
/** Discovery uses actual current membership, never candidate/historical IDs/counts.
 * Old retained-parent readers continue their exact independent assertion path. */
async function captureMasterCurrentParentInternalR1(client:QueryClient,
 input:Readonly<{releaseId:string;catalogId:FixedElectricalCurrentCatalogR1|typeof MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id;absoluteDeadlineUtc:string;completeRawProfile?:'FIXED_WALL_COMPLETE_RAW_READ_R2'}>,verificationOracle?:MasterIntegratedCuringRawOracleR145){
 const allowed=['canonical-work:base:electrical_interior_lighting_install_technical_room','canonical-work:base:electrical_interior_socket_install_standard',MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id];
 const need=(value:unknown,code:string):void=>{if(!value)throw Error('ELECTRICAL_CURRENT_'+code);};
 need(allowed.includes(input.catalogId)&&input.releaseId==='01417cef-3091-5012-844d-1bbd9e75cee1','FIXED_CURRENT_SELECTOR');
 const completeRaw=input.completeRawProfile!==undefined;
 need(!completeRaw||(input.completeRawProfile==='FIXED_WALL_COMPLETE_RAW_READ_R2'&&input.catalogId===MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id),'FIXED_WALL_COMPLETE_RAW_SCOPE');
 const start=performance.now(),end=Date.parse(input.absoluteDeadlineUtc);
 const time=()=>need(Number.isFinite(end)&&Date.now()<end&&performance.now()-start<=12000,'READ_DEADLINE');
 time();const session=(await client.query("select current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,current_setting('TimeZone') timezone")).rows;time();
 if(verificationOracle!==undefined){assertMasterIntegratedCuringRawOracleR145(verificationOracle);need(completeRaw&&input.catalogId===MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id,'VERIFICATION_FIXED_WALL_ONLY');}
 need(session.length===1&&session[0]!.timezone==='UTC'&&(verificationOracle===undefined
  ?session[0]!.isolation==='repeatable read'&&session[0]!.read_only==='on'
  :session[0]!.isolation==='read committed'&&session[0]!.read_only==='off'),'READ_ONLY_RR_UTC_REQUIRED');
 const atomic=createMasterAtomicRawReadR1(client,{config:{stopCode:'ELECTRICAL_CURRENT'}},time,undefined,input.completeRawProfile);
 const rawRows:Record<string,string[]>={};
 const full=async(key:MasterAtomicCollectionR1,table:string,predicate:string,values:unknown[],cap:number,profile?:MasterFixedWallBaselineProfileR1):Promise<Json[]>=>{
  const rows=await atomic(masterRetainedFullRowSqlR1(table,predicate,cap),"json_build_object('raw',raw)",values,cap,key,profile);
  need(rows.every(row=>typeof row.raw==='string'),'RAW_ROWS');rawRows[key]=rows.map(row=>row.raw);
  return rawRows[key]!.map(raw=>{const parsed:unknown=JSON.parse(raw);need(object(parsed),'RAW_OBJECT');return parsed as Json;});
 };
 const membership=await full('membership','estimate_cumulative_manifest_entry','release_id=$1 and catalog_id=$2',[input.releaseId,input.catalogId],1);
 need(membership.length===1,'CURRENT_MEMBERSHIP_SINGLE');const member=membership[0]!;
 if(input.catalogId===MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id)assertMonolithicWallCurrentMembershipR1(member);
 const definition=await full('definition','estimate_definition_version','id=$1 and catalog_id=$2',[member.definition_version_id,input.catalogId],1);
 const baseline=await full('baseline','estimate_approved_template_baseline','id=$1 and definition_version_id=$2 and catalog_id=$3',[member.approved_template_baseline_id,member.definition_version_id,input.catalogId],1,!completeRaw&&input.catalogId===MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id?{kind:'FIXED_MONOLITHIC_WALL_BASELINE_2M_R1',membership:member}:undefined);
 need(definition.length===1&&baseline.length===1&&definition[0]!.definition_sha256===member.definition_hash,'CURRENT_PARENT_IDENTITY');
 const id=definition[0]!.id;
 const parameters=await full('parameters','estimate_parameter_definition','definition_version_id=$1',[id],4096);
 const formulas=await full('formulas','estimate_formula_graph','definition_version_id=$1',[id],4096);
 const resources=await full('resources','estimate_resource_spec','definition_version_id=$1',[id],4096);
 const bindings=await full('bindings','estimate_work_normative_binding','definition_version_id=$1',[id],4096);
 const normativeLocators=await full('normativeLocators','estimate_normative_locator','id in (select locator_id from public.estimate_work_normative_binding where definition_version_id=$1)',[id],4096);
 const normativeSources=await full('normativeSources','estimate_normative_source','id in (select source_id from public.estimate_normative_locator where id in (select locator_id from public.estimate_work_normative_binding where definition_version_id=$1))',[id],4096);
 const contentPassports=await full('contentPassport','estimate_content_passport_r3','definition_version_id=$1',[id],1);
 const identities=await full('publicIdentity','estimate_work_identity','catalog_id=$1',[input.catalogId],1);
 need(contentPassports.length===1&&identities.length===1,'PASSPORT_IDENTITY_SINGLE');
 const sourceIds=new Set(normativeSources.map(row=>row.id)),locatorIds=new Set(normativeLocators.map(row=>row.id)),resourceIds=new Set(resources.map(row=>row.id));
 need(normativeLocators.every(row=>sourceIds.has(row.source_id))&&bindings.every(row=>locatorIds.has(row.locator_id)&&resourceIds.has(row.resource_spec_id)),'ACTUAL_FK_CLOSURE');
 const expected=JSON.stringify(definition[0]!.source_metadata);need(typeof expected==='string'&&Buffer.byteLength(expected)<=524288,'SOURCE_METADATA_CAP');
 time();const roundtrip=(await client.query(`select (octet_length(source_metadata::text)<=524288
    and source_metadata::text=($1::jsonb)::text) matches
    from public.estimate_definition_version where id=$2::uuid and catalog_id=$3`,[expected,id,input.catalogId])).rows;time();
 need(roundtrip.length===1&&roundtrip[0]!.matches===true,'SOURCE_METADATA_LOSSLESS_ROUNDTRIP');
 return {contract:input.catalogId===MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id?'fixed-monolithic-wall-current-parent-read/r1':'fixed-electrical-current-parent-read/r1',capture:{definition:definition[0],baseline:baseline[0],parameters,formulas,resources,bindings,normativeSources,normativeLocators},
  contentPassport:contentPassports[0],membership:member,publicIdentity:identities[0],readOnly:true,sourceMetadataLosslessRoundtrip:true,
  rawRows,rawRowsSha256:createHash('sha256').update(JSON.stringify(rawRows)).digest('hex'),sourceAdmission:false,full:false};
}

async function lockMasterRetainedTablesR1(client:QueryClient,keys:readonly string[]):Promise<void>{
  for (const key of keys) await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`master-single-definition-retain:v1:${key}`]);
  await client.query(`lock table
    public.estimate_cumulative_manifest_entry,
    public.estimate_definition_release,
    public.estimate_definition_version,
    public.estimate_normative_locator,
    public.estimate_normative_source,
    public.estimate_formula_graph,
    public.estimate_approved_template_baseline,
    public.estimate_parameter_definition,
    public.estimate_resource_spec,
    public.estimate_work_normative_binding
    in share row exclusive mode`);
}

export async function captureMasterElectricalCurrentParentReadOnlyR1(client:QueryClient,
 input:Readonly<{releaseId:string;catalogId:FixedElectricalCurrentCatalogR1|typeof MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id;absoluteDeadlineUtc:string;completeRawProfile?:'FIXED_WALL_COMPLETE_RAW_READ_R2'}>){
 return captureMasterCurrentParentInternalR1(client,input);
}

const INTEGRATED_WALL_LOCK_TABLES_R145=MASTER_WALL_NUMERIC_INVENTORY_R1.map(v=>v.table);
/** No admission/config/writer input is accepted by this verification-only API. */
export async function lockMasterIntegratedCuringCurrentR145(client:QueryClient,oracle:MasterIntegratedCuringRawOracleR145,absoluteDeadlineUtc:string):Promise<void>{
 assertMasterIntegratedCuringRawOracleR145(oracle);
 const time=()=>{if(!Number.isFinite(Date.parse(absoluteDeadlineUtc))||Date.now()>=Date.parse(absoluteDeadlineUtc))throw Error('INTEGRATED_CURING_DEADLINE');};
 time();const isolation=(await client.query('show transaction_isolation')).rows;time();
 if(isolation[0]?.transaction_isolation!=='read committed')throw Error('INTEGRATED_CURING_READ_COMMITTED_REQUIRED');
 const sources=oracle.normativeSources.map(v=>JSON.parse(v) as Json);
 const baseline=JSON.parse(oracle.baseline[0]!) as Json;
 const sourceKeys=Object.values(baseline.normative_source_ids as Record<string,string[]>).flat();
 const keys=setOf([`definition:${MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.definition_version_id}`,
  ...sources.map(v=>`source-key:${v.source_key}`),...sourceKeys.map(v=>`source-key:${v}`)]);
 const bounded:QueryClient={query:(async(sql:string,values?:unknown[])=>{time();const result=await client.query(sql,values);time();return result;}) as Client['query']};
 await lockMasterRetainedTablesR1(bounded,keys);time();
 await client.query('lock table public.estimate_content_passport_r3,public.estimate_work_identity in share row exclusive mode');time();
}
export async function readMasterIntegratedCuringCurrentR145(client:QueryClient,oracle:MasterIntegratedCuringRawOracleR145,
 phase:'NORMAL'|'LOCKED',absoluteDeadlineUtc:string){
 assertMasterIntegratedCuringRawOracleR145(oracle);
 if(phase!=='NORMAL'&&phase!=='LOCKED')throw Error('INTEGRATED_CURING_PHASE_REQUIRED');
 if(Date.now()>=Date.parse(absoluteDeadlineUtc)||!Number.isFinite(Date.parse(absoluteDeadlineUtc)))throw Error('INTEGRATED_CURING_DEADLINE');
 if(phase==='LOCKED'){
  const locks=(await client.query(`select relation::regclass::text relation from pg_locks where pid=pg_backend_pid() and granted
   and relation=any($1::regclass[]) and mode in ('ShareRowExclusiveLock','ExclusiveLock','AccessExclusiveLock')`,[INTEGRATED_WALL_LOCK_TABLES_R145.map(v=>'public.'+v)])).rows;
  const names=new Set(locks.map(v=>String(v.relation).replace(/^public\./u,'')));
  if(!INTEGRATED_WALL_LOCK_TABLES_R145.every(v=>names.has(v)))throw Error('INTEGRATED_CURING_ALL_ELEVEN_TABLE_LOCKS_REQUIRED');
 }
 const result=await captureMasterCurrentParentInternalR1(client,{releaseId:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.release_id,
  catalogId:MONOLITHIC_WALL_CURRENT_MEMBERSHIP_R1.catalog_id,absoluteDeadlineUtc,completeRawProfile:'FIXED_WALL_COMPLETE_RAW_READ_R2'},oracle);
 if(result.rawRowsSha256!=='686debb3d3db54db2dc9aab54767b398be89a0fcd2942272e58b518943cf2d9e'
  ||JSON.stringify(result.rawRows)!==JSON.stringify(oracle))throw Error('INTEGRATED_CURING_CURRENT_FULL_RAW_ORACLE_DRIFT');
 // The internal legacy readOnly flag is never returned as a READ ONLY transaction claim.
 return{contract:'already-integrated-curing-verification/r145' as const,capture:result.capture as MasterRetainedParentCaptureR1,membership:result.membership,
  rawRowsSha256:result.rawRowsSha256,sourcePresent:true,readOnlyTransactionClaim:false,isolation:'read committed' as const,
  databaseWrites:0,sourceAdmission:false,full:false};
}
