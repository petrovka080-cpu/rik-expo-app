import assert from 'node:assert/strict';
import {facadeVentilatedSteelMasterConfigR5} from './prepareFacadeVentilatedSteelExistingOwnerR5';
import {facadeVentilatedPorcelainMasterConfigR214} from './prepareFacadeVentilatedPorcelainExistingOwnerR214';
import {facadeVentilatedSteelAreaR5 as steelArea,facadeVentilatedSteelDefinitionR5 as steelDefinition} from '../../../src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5';
import {facadeSteelSidingPackR2 as steel} from '../../../src/lib/estimate/v4/facadeSteelSidingKrer15R2';
import {facadePorcelainProfileR59 as porcelain} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import {facadeNvfSteelPorcelainDefinitionR221 as finalIndependentDefinition} from '../../../src/lib/estimate/v4/facadeNvfSteelPorcelainOneOwnerR221';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,resolveMasterRetainedBaselineInputClassificationR1,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

type Json=Record<string,unknown>;
const record=(value:unknown):value is Json=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const optionalTextIds=['drawings_or_specification','project_location'];
const keys=(value:Readonly<Record<string,unknown>>)=>Object.keys(value).sort();
type Representative=Readonly<{parameter_schema_sha256:string;input_values:Json;input_classification:Record<string,string>;
  uom_by_parameter:Json;formula_consumer_ids:Record<string,string[]>;resource_consumer_row_ids:Record<string,string[]>;
  normative_source_ids:Record<string,readonly string[]>;guide_provenance_ru:Record<string,string>;proposal_source_refs:Json[]}>;
export type SequentialSparseFixtureR226=Readonly<{stage:'CURRENT_V6_TO_STEEL'|'ACTUAL_STEEL_TO_PORCELAIN';
  evidenceKind:'SOURCE_ONLY_CURRENT_PUBLISHER_BASELINE_REPRESENTATIVE_PROJECTION_NOT_A_FUTURE_DB_CAPTURE';
  model:AutomaticOwnerDefinition;representative:Representative;retainedSourceArrays:Record<string,readonly string[]>;
  metadataOnlyMissingOptionalTextIds:readonly string[];expected:Readonly<{inputKeys:number;classificationKeys:number;sourceKeys:number;schema:number}>}>;

/** Mirrors only the existing publisher's baselineRepresentative (d915:1831–1865).
 * It uses the existing classification/consumer owners, and supplies no default
 * value, fake source key, future ID, version or captured-parent hash. */
function representative(model:AutomaticOwnerDefinition,config:Config,retainedSources:Readonly<Record<string,readonly string[]>>,
  appendedSources:Readonly<Record<string,readonly string[]>>):Representative{
  const consumers=buildMasterParameterCalculationConsumers(model),metadata=config.sourceMetadata;
  return{parameter_schema_sha256:valueSha(model.parameters.map(p=>({...p}))),
    input_values:{...config.acceptanceInput,...config.runtimeProfileInput},
    input_classification:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,resolveMasterRetainedBaselineInputClassificationR1(
      p.parameter_id,config.runtimeProfileClassification??{},config.binding.retainParentBindings)])),
    uom_by_parameter:Object.fromEntries(model.parameters.map(p=>[p.parameter_id,p.unit_id])),
    formula_consumer_ids:consumers.formulaConsumers,resource_consumer_row_ids:consumers.resourceConsumers,
    normative_source_ids:{...structuredClone(retainedSources),...structuredClone(appendedSources)},
    guide_provenance_ru:Object.fromEntries(model.parameters.map(p=>{const t=p.truth_metadata;
      if(t.visibility_role==='INTERNAL_ONLY'&&t.effective_resource_quantity_v1!=null&&t.guide==null)return[p.parameter_id,''];
      assert(record(t.guide));return[p.parameter_id,String(t.guide.guide_short_ru)];})),
    proposal_source_refs:[{contract:config.contract,sourceId:config.sourceId,
      sourceKind:metadata.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',exactLocator:metadata.exact_locator}]};
}
/** This is a fixture factory, not a second admission implementation. ROOT's
 * existing common owner must evaluate the positive/negative inputs below. */
export function facadeNvfSequentialSparseFixturesR226(context:Readonly<{releaseId:string;searchReleaseId:string;sourceRoot:string}>){
  const first=facadeVentilatedSteelMasterConfigR5(context),firstRetained=first.binding.retainParentBindings;assert(firstRetained);
  const oldSources=firstRetained.capturedParent.baseline.normative_source_ids;
  const steelSources=Object.fromEntries(Object.entries(firstRetained.newParameterSources).map(([id,spec])=>[id,spec.sourceIds]));
  const firstModel=steelDefinition();assert.deepEqual(first.parameterDefinitions,firstModel.parameters);
  assert.deepEqual(first.formulaDefinitions,firstModel.formulas);assert.deepEqual(first.resourceDefinitions,firstModel.resources);
  const steelBaseline=representative(firstModel,first,oldSources,steelSources);
  const finalModel=finalIndependentDefinition(),porcelainBase=facadeVentilatedPorcelainMasterConfigR214(context);
  const firstIds=new Set(firstModel.parameters.map(p=>p.parameter_id));
  const porcelainSources=Object.fromEntries(finalModel.parameters.filter(p=>!firstIds.has(p.parameter_id)).map(p=>[p.parameter_id,
    ['UNRESOLVED_APPLICATION_NORM','COMPILER_DERIVED_RESOURCE_QUANTITY'].includes(String(p.truth_metadata.value_source_role))?[]:[porcelain.sourceId]]));
  // Only a key/consumer projection is needed here. The original three legacy
  // assumption classifications are unchanged by the first steel publication.
  // Actual second-stage parameter-schema SHA/IDs come from its real capture;
  // this source-model SHA must never be substituted for that actual identity.
  const secondConfig:Config={...porcelainBase,acceptanceInput:structuredClone(steelBaseline.input_values),
    binding:{...porcelainBase.binding,retainParentBindings:firstRetained}};
  const porcelainBaseline=representative(finalModel,secondConfig,steelBaseline.normative_source_ids,porcelainSources);
  const fixtures:SequentialSparseFixtureR226[]=[
    {stage:'CURRENT_V6_TO_STEEL',evidenceKind:'SOURCE_ONLY_CURRENT_PUBLISHER_BASELINE_REPRESENTATIVE_PROJECTION_NOT_A_FUTURE_DB_CAPTURE',
      model:firstModel,representative:steelBaseline,retainedSourceArrays:structuredClone(oldSources),metadataOnlyMissingOptionalTextIds:optionalTextIds,
      expected:{inputKeys:4,classificationKeys:117,sourceKeys:115,schema:117}},
    {stage:'ACTUAL_STEEL_TO_PORCELAIN',evidenceKind:'SOURCE_ONLY_CURRENT_PUBLISHER_BASELINE_REPRESENTATIVE_PROJECTION_NOT_A_FUTURE_DB_CAPTURE',
      model:finalModel,representative:porcelainBaseline,retainedSourceArrays:structuredClone(steelBaseline.normative_source_ids),metadataOnlyMissingOptionalTextIds:optionalTextIds,
      expected:{inputKeys:7,classificationKeys:197,sourceKeys:195,schema:197}},
  ];
  for(const f of fixtures){assert.deepEqual([keys(f.representative.input_values).length,keys(f.representative.input_classification).length,
    keys(f.representative.normative_source_ids).length,f.model.parameters.length],
    [f.expected.inputKeys,f.expected.classificationKeys,f.expected.sourceKeys,f.expected.schema]);
    assert.deepEqual(f.model.parameters.filter(p=>!Object.hasOwn(f.representative.normative_source_ids,p.parameter_id)).map(p=>p.parameter_id).sort(),[...optionalTextIds].sort());
    for(const id of optionalTextIds){const p=f.model.parameters.find(p=>p.parameter_id===id);assert(p);assert.equal(p.value_type,'text');assert.equal(p.unit_id,null);
      assert.equal(p.required,false);assert.equal(p.default_value,null);assert(!f.model.formulas.some(formula=>formula.input_parameter_ids.includes(id)));}
    for(const id of keys(f.representative.input_values))assert(Object.hasOwn(f.representative.input_classification,id)&&Object.hasOwn(f.representative.normative_source_ids,id));
    for(const[id,array]of Object.entries(f.retainedSourceArrays))assert.deepEqual(f.representative.normative_source_ids[id],array);
  }
  return fixtures;
}

/** Proposed marker only. ROOT owns its eventual emission and validation in the
 * existing publisher/retainer. No marker is written to a historical baseline.
 * actualCapturedParentSha256 has no default; a future stage2 hash is UNKNOWN. */
export function proposedSequentialSparseProposalRefR226(fixture:SequentialSparseFixtureR226,actualCapturedParentSha256:string){
  assert(/^[0-9a-f]{64}$/u.test(actualCapturedParentSha256));const b=fixture.representative;
  return{contract:'master-retained-sparse-baseline-metadata/v1',parameterSchemaSha256:b.parameter_schema_sha256,
    capturedParentSha256:actualCapturedParentSha256,inputParameterIdsSha256:valueSha(keys(b.input_values)),
    classificationParameterIdsSha256:valueSha(keys(b.input_classification)),sourceParameterIdsSha256:valueSha(keys(b.normative_source_ids)),
    omittedOptionalNullTextParameterIds:[...fixture.metadataOnlyMissingOptionalTextIds],
    normativeSourceArraysSha256:valueSha(b.normative_source_ids),inputClassificationSha256:valueSha(b.input_classification),
    consumerBindingsSha256:valueSha({formula:b.formula_consumer_ids,resource:b.resource_consumer_row_ids}),
    retainedSourceArraysSha256:valueSha(fixture.retainedSourceArrays),noDefaultsInserted:true};
}

export type SparseNegativeCaseR226=Readonly<{name:string;expectedInvariant:string;marker:'EXACT'|'OMIT'|'STALE_SCHEMA';
  mutate:(value:SequentialSparseFixtureR226)=>SequentialSparseFixtureR226}>;
export const facadeNvfSequentialSparseNegativeCasesR226:readonly SparseNegativeCaseR226[]=[
  {name:'extraneous-input-id',expectedInvariant:'INPUT_KEYS_SUBSET_OF_SCHEMA_AND_BOTH_METADATA_KEYSETS',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);x.representative.input_values['TEST_ONLY:not-in-schema']='INVALID_EXTRA_KEY';return x;}},
  {name:'extraneous-source-id',expectedInvariant:'ALL_METADATA_IDS_IN_EXACT_SCHEMA',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);x.representative.normative_source_ids['TEST_ONLY:not-in-schema']=[steel.sourceId];return x;}},
  {name:'extraneous-classification-id',expectedInvariant:'ALL_METADATA_IDS_IN_EXACT_SCHEMA',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);x.representative.input_classification['TEST_ONLY:not-in-schema']='VALIDATION_FIXTURE';return x;}},
  {name:'missing-numeric-source-key',expectedInvariant:'ALL_NONEXCLUDED_SCHEMA_FIELDS_HAVE_SOURCE_METADATA_KEY',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);assert(Object.hasOwn(x.representative.normative_source_ids,steelArea));delete x.representative.normative_source_ids[steelArea];return x;}},
  {name:'optional-text-becomes-required',expectedInvariant:'EXCLUSION_IS_EXACT_CURRENT_OPTIONAL_NULL_TEXT_ONLY',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);const p=x.model.parameters.find(p=>p.parameter_id===optionalTextIds[0]);assert(p);p.required=true;return x;}},
  {name:'optional-text-now-used-by-formula',expectedInvariant:'NO_OMITTED_FIELD_IS_USED_BY_ANY_FORMULA',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);const formula=x.model.formulas[0];assert(formula);formula.input_parameter_ids.push(optionalTextIds[0]!);return x;}},
  {name:'schema-parameter-unit-drift',expectedInvariant:'EXACT_PARAMETER_SCHEMA_HASH_AND_PARENT_PARAMETER_SEMANTICS',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);const p=x.model.parameters.find(p=>p.parameter_id===steelArea);assert(p);p.unit_id='TEST_ONLY_INVALID_UNIT';return x;}},
  {name:'retained-source-array-relabelled',expectedInvariant:'EVERY_RETAINED_SOURCE_ARRAY_UNCHANGED',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);const id=keys(x.retainedSourceArrays).find(id=>x.retainedSourceArrays[id]!.length>0);assert(id);
    x.representative.normative_source_ids[id]=['TEST_ONLY_INVALID_SOURCE_ALIAS'];return x;}},
  {name:'consumer-binding-metadata-drift',expectedInvariant:'EXACT_EXISTING_FORMULA_AND_RESOURCE_CONSUMERS',marker:'EXACT',mutate:f=>{
    const x=structuredClone(f);x.representative.resource_consumer_row_ids[steelArea]=[];return x;}},
  {name:'unmarked-new-sparse-record',expectedInvariant:'NEW_VERSIONED_MARKER_REQUIRED_HISTORICAL_R62_EXCEPTION_UNCHANGED',marker:'OMIT',mutate:f=>structuredClone(f)},
  {name:'stale-marker-schema',expectedInvariant:'MARKER_BINDS_EXACT_SCHEMA_AND_CAPTURE',marker:'STALE_SCHEMA',mutate:f=>structuredClone(f)},
];
