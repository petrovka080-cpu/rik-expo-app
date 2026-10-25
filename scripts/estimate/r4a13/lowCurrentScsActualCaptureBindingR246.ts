import assert from 'node:assert/strict';
import {readFrozenDefinitionSnapshotV1} from '../../../src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {CanonicalEstimateFormulaDefinition,CanonicalEstimateResourceDefinition} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {createLowCurrentScsPostsFiniteConfigR24,type LowCurrentScsFiniteRuntimeInputR24} from './lowCurrentScsPostsFiniteRuntimeR24';

export const lowCurrentScsActualParentPinR246=Object.freeze({
  path:'C:\\Users\\User\\Documents\\Codex\\2026-10-24\\files-pasted-by-the-user-21\\work\\minimal-current-parent-r246\\scs\\results\\CURRENT_FULL_PARENT_1_R244.json',
  sha256:'649e4c5b9439bae57e5a23ad32393e6c529c89b76f5b2f102c35354b11cb1cc0',
});
export const lowCurrentScsActualIdentityR246=Object.freeze({
  catalogId:'canonical-work:expanded:low_voltage_system',
  definitionId:'cb5756cb-cb9d-5238-b415-9fb3913601ea',definitionVersion:4,
  definitionSha256:'0e464c9301721640a7eb7b8c1e59ba0a4c3f24000c510541b4736da44c6a855c',
  baselineId:'260f981d-bdcb-5ad3-8a15-018731c44455',
});
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const stringArray=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
export type LowCurrentScsNativeRuntimeContextR246=Pick<AutomaticOwnerDefinition,'runtimeInput'|'runtimeClassification'|'runtimeSourceIds'>;

/** Only a shape/value boundary for ROOT's real frozen capture. No baseline
 * fixture values, source authority, project facts or stock are promoted here. */
export function bindLowCurrentScsActualCaptureR246(raw:unknown,nativeRuntime:LowCurrentScsNativeRuntimeContextR246){
  assert(object(raw)&&object(raw.capture)&&object(raw.contentPassport),'ACTUAL_SCS_CAPTURE_WRAPPER_REQUIRED');
  assert.equal(raw.readOnly,true);assert.equal(raw.sourceMetadataLosslessRoundtrip,true);
  const models=readFrozenDefinitionSnapshotV1({models:[{...raw.capture,passport:raw.contentPassport}]},'models').models;
  assert.equal(models.length,1);const model=models[0];assert(model);
  const identity=lowCurrentScsActualIdentityR246;
  assert.equal(model.definition.id,identity.definitionId);assert.equal(model.definition.catalog_id,identity.catalogId);
  assert.equal(model.definition.definition_version,identity.definitionVersion);assert.equal(model.definition.definition_sha256,identity.definitionSha256);
  assert.equal(model.baseline.id,identity.baselineId);assert.equal(model.baseline.definition_version_id,identity.definitionId);
  assert.equal(model.passport.definition_version_id,identity.definitionId);
  assert.equal(model.parameters.length,47);assert.equal(model.formulas.length,33);assert.equal(model.resources.length,33);assert.equal(model.bindings.length,1);
  const parameters:AutomaticOwnerDefinition['parameters']=model.parameters.map(row=>{
    assert(typeof row.parameter_id==='string'&&typeof row.value_type==='string'&&typeof row.required==='boolean');
    assert(typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal)&&typeof row.title_ru==='string');
    assert(row.unit_id===null||typeof row.unit_id==='string');
    assert(row.constraints_json===null||object(row.constraints_json));assert(object(row.truth_metadata));
    return{...row,parameter_id:row.parameter_id,value_type:row.value_type,required:row.required,
      ordinal:row.ordinal,title_ru:row.title_ru,unit_id:row.unit_id,default_value:row.default_value,
      constraints_json:row.constraints_json,truth_metadata:row.truth_metadata};
  });
  const formulas:CanonicalEstimateFormulaDefinition[]=model.formulas.map(row=>{
    assert(typeof row.formula_id==='string'&&typeof row.output_unit_id==='string'&&typeof row.expression_source==='string');
    assert(typeof row.ast_sha256==='string'&&stringArray(row.input_parameter_ids));
    const parsed=compileFormulaGraph(row.expression_source);
    assert.deepEqual(parsed.ast,row.ast,'CAPTURED_FORMULA_AST_MUST_EQUAL_EXISTING_PARSER');
    assert.deepEqual(parsed.inputParameterIds,row.input_parameter_ids,'CAPTURED_FORMULA_INPUTS_MUST_EQUAL_EXISTING_PARSER');
    return{...row,formula_id:row.formula_id,output_unit_id:row.output_unit_id,expression_source:row.expression_source,
      ast:parsed.ast,input_parameter_ids:row.input_parameter_ids,ast_sha256:row.ast_sha256};
  });
  const resources:CanonicalEstimateResourceDefinition[]=model.resources.map(row=>{
    assert(typeof row.id==='string'&&typeof row.row_id==='string'&&typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal));
    assert(typeof row.section==='string'&&typeof row.category==='string'&&typeof row.title_ru==='string');
    assert(typeof row.unit_id==='string'&&typeof row.formula_id==='string'&&typeof row.row_sha256==='string');
    assert(object(row.inclusion_ast)&&object(row.resource_graph)&&typeof row.procurement_eligible==='boolean');
    assert(row.cost_owner_id===null||typeof row.cost_owner_id==='string');assert(row.source_metadata===null||object(row.source_metadata));
    return{...row,id:row.id,row_id:row.row_id,ordinal:row.ordinal,section:row.section,category:row.category,title_ru:row.title_ru,
      unit_id:row.unit_id,formula_id:row.formula_id,row_sha256:row.row_sha256,inclusion_ast:row.inclusion_ast,
      resource_graph:row.resource_graph,procurement_eligible:row.procurement_eligible,cost_owner_id:row.cost_owner_id,source_metadata:row.source_metadata};
  });
  const actualArrays={parameters:model.parameters,formulas:model.formulas,resources:model.resources};
  assert.deepEqual({parameters,formulas,resources},actualArrays,'NATIVE_CAPTURE_FIELDS_AND_VALUES_UNCHANGED');
  const runtimeKeys=Object.keys(nativeRuntime.runtimeInput).sort();
  assert.deepEqual(Object.keys(nativeRuntime.runtimeClassification).sort(),runtimeKeys);
  assert.deepEqual(Object.keys(nativeRuntime.runtimeSourceIds).sort(),runtimeKeys);
  for(const key of runtimeKeys){
    const parameter=parameters.find(row=>row.parameter_id===key);assert(parameter);
    assert.equal(parameter.truth_metadata.value_source_role,'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE');
    assert.equal(parameter.truth_metadata.runtime_profile_value,true);assert.equal(nativeRuntime.runtimeClassification[key],'ASSUMPTION');
    assert(nativeRuntime.runtimeSourceIds[key]?.length,'EXPLICIT_ROOT_PROFILE_SOURCE_REQUIRED');
  }
  const definition:AutomaticOwnerDefinition={parameters,formulas,resources,...nativeRuntime,
    ordinaryParameterIds:parameters.filter(row=>row.truth_metadata.value_source_role==='USER_INPUT').map(row=>row.parameter_id)};
  return{catalogId:identity.catalogId,definitionId:identity.definitionId,definitionVersion:identity.definitionVersion,
    definitionSha256:identity.definitionSha256,computationSha256:hash(actualArrays),definition};
}

export type LowCurrentScsBoundFiniteInputR246=Omit<LowCurrentScsFiniteRuntimeInputR24,'currentCapture'|'expectedCurrent'|'bindActualCapture'>&Readonly<{
  /** Same actual JSON that ROOT read from the pinned file. The existing finite
   * entry independently reads and SHA-checks that file before using this bind. */
  actualCurrentCapture:unknown;nativeRuntime:LowCurrentScsNativeRuntimeContextR246;
}>;
export function createLowCurrentScsBoundFiniteConfigR246(input:LowCurrentScsBoundFiniteInputR246){
  const{actualCurrentCapture,nativeRuntime,...rootInputs}=input;
  const bound=bindLowCurrentScsActualCaptureR246(actualCurrentCapture,nativeRuntime);
  return createLowCurrentScsPostsFiniteConfigR24({...rootInputs,currentCapture:lowCurrentScsActualParentPinR246,
    expectedCurrent:{catalogId:bound.catalogId,definitionId:bound.definitionId,definitionVersion:bound.definitionVersion,
      definitionSha256:bound.definitionSha256,computationSha256:bound.computationSha256},
    bindActualCapture:raw=>bindLowCurrentScsActualCaptureR246(raw,nativeRuntime)});
}
