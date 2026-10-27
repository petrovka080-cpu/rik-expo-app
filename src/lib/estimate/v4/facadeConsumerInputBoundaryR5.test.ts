import assert from 'node:assert/strict';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateSourceManagedParameter} from '../backendPlatform/canonicalEstimateParameterSemantics';
import {facadeGlassWholeDefinitionR4,facadeGlassWholePrimaryR4,facadeGlassWholeControlR4,facadeGlassWholePackR4,type FacadeGlassWholeMethodKeyR4} from './facadeGlassWholeMethodsR4';
import {facadeGlassVacuumWholeDefinitionR5,facadeGlassVacuumPrimaryR5} from './facadeGlassVacuumWholeDeviceR5';
import {facadeBoardWithEndProtectionDefinitionR5} from './facadeTimberEndProtectionWholeR5';
import {masterFacadeGlassRepresentativeR4,masterFacadeGlassCapturedParentR4,buildMasterFacadeGlassWholeSuccessorR4,facadeGlassSelectorR4} from './masterFacadeGlassWholeFamilyR4';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals} from '../backendPlatform/formulaGraph';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';

type Schema=CanonicalEstimateCatalogItem['parameterSchema'][number];
function valueType(value:string):Schema['valueType'] {
  if(value==='decimal'||value==='integer'||value==='enum'||value==='text'||value==='boolean'||value==='array_object')return value;
  throw Error('UNSUPPORTED_SOURCE_VALUE_TYPE');
}
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function valueRole(value:unknown):NonNullable<Schema['valueSourceRole']> {
  assert(value==='USER_INPUT'||value==='USER_MEASURED'||value==='USER_OR_PROJECT_MEASURED'||value==='VISIBLE_NORMATIVE_OR_REPLACEABLE_PROFILE'
    ||value==='PROJECT_SPECIFIC_INPUT'||value==='CONDITIONAL_PROJECT_FACT'||value==='VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'||value==='PROJECT_DOCUMENTATION'
    ||value==='ENGINEERING_DESIGN'||value==='SITE_SURVEY'||value==='MANDATORY_NORM_VALUE'||value==='UNRESOLVED_APPLICATION_NORM'
    ||value==='NORM_REQUIRED_BUT_PROJECT_SELECTED'||value==='MANUFACTURER_CONFIRMED'||value==='SELECTED_EQUIPMENT_PASSPORT'||value==='SOURCE_BACKED_PRELIMINARY_PROFILE'
    ||value==='VISIBLE_PRELIMINARY_SCENARIO'||value==='VISIBLE_BASELINE_ASSUMPTION'||value==='BACKEND_DERIVED'||value==='COMPILER_DERIVED_RESOURCE_QUANTITY'
    ||value==='PRICE_INPUT','ACTUAL_VALUE_SOURCE_ROLE_REQUIRED');
  return value;
}
function guideSchema(value:unknown):NonNullable<Schema['guide']> {
  assert(value!==null&&typeof value==='object'&&!Array.isArray(value),'ACTUAL_GUIDE_RECORD_REQUIRED');
  const guide=value as Record<string,unknown>;
  const text=(value:unknown,field:string):string=>{assert(typeof value==='string','ACTUAL_GUIDE_TEXT_REQUIRED:'+field);return value;};
  const guideKind=guide.guide_kind,policy=guide.guide_validation_policy,role=guide.source_role;
  assert(guideKind==='MANDATORY_NORM_VALUE'||guideKind==='NORMATIVE_RANGE'||guideKind==='PROJECT_DEFINED'
    ||guideKind==='MANUFACTURER_RANGE'||guideKind==='MEASUREMENT_RULE'||guideKind==='ENUM_DECISION_RULE'
    ||guideKind==='DERIVED_VALUE_RULE'||guideKind==='PRACTICE_REFERENCE'||guideKind==='NO_NUMERIC_NORM','ACTUAL_GUIDE_KIND_REQUIRED');
  assert(policy==='MANDATORY_BLOCK'||policy==='ADVISORY_REASON_REQUIRED'||policy==='PROVENANCE_REQUIRED'
    ||policy==='INFORMATION_ONLY','ACTUAL_GUIDE_POLICY_REQUIRED');
  assert(role==='PROJECT_DOCUMENTATION'||role==='USER_SUPPLIED_PRIMARY_FACT'
    ||role==='VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION','ACTUAL_AUTOMATIC_GUIDE_ROLE_REQUIRED');
  // Normalize the existing automatic-owner wire aliases to the catalog contract.
  const sourceRole=role==='USER_SUPPLIED_PRIMARY_FACT'?'USER_INPUT'
    :role==='VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION'?'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE':role;
  return{guideKind,guideShortRu:text(guide.guide_short_ru,'guide_short_ru'),sourceRole,
    sourceDocument:text(guide.source_document,'source_document'),sourceLocator:text(guide.source_locator,'source_locator'),
    guideVersion:text(guide.guide_version,'guide_version'),sourceSnapshotHash:text(guide.source_snapshot_hash,'source_snapshot_hash'),
    applicability:text(guide.applicability,'applicability'),verifiedAt:text(guide.verified_at,'verified_at'),guideValidationPolicy:policy};
}
function consumerSchemas(model:AutomaticOwnerDefinition):Schema[] {
  // Use the exact existing publication enrichment. Raw automatic source
  // factories do not yet contain the immutable DB consumer metadata.
  const consumers=buildMasterParameterCalculationConsumers(model);
  return model.parameters.map(p=>{
    const preliminaryCompilationAllowed=p.truth_metadata.preliminary_compilation_allowed;
    assert(preliminaryCompilationAllowed===undefined||typeof preliminaryCompilationAllowed==='boolean','ACTUAL_PRELIMINARY_FLAG_REQUIRED');
    const semanticParameterKey=p.truth_metadata.semantic_parameter_key,provenance=p.truth_metadata.provenance;
    const visibilityRole=p.truth_metadata.visibility_role;
    assert(semanticParameterKey===undefined||typeof semanticParameterKey==='string'&&semanticParameterKey.length>0,'ACTUAL_SEMANTIC_KEY_REQUIRED');
    assert(provenance===undefined||record(provenance),'ACTUAL_PROVENANCE_RECORD_REQUIRED');
    assert(visibilityRole==='USER_INPUT'||visibilityRole==='USER_DERIVED_READONLY'||visibilityRole==='INTERNAL_ONLY','ACTUAL_VISIBILITY_ROLE_REQUIRED');
    const rawGuide=p.truth_metadata.guide;assert(record(rawGuide),'ACTUAL_GUIDE_RECORD_REQUIRED');
    const schema:Schema={parameterId:p.parameter_id,ordinal:p.ordinal,valueType:valueType(p.value_type),
    titleRu:p.title_ru,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json??{},
    semanticParameterKey,
    guide:guideSchema(rawGuide),
    visibilityRole,valueSourceRole:valueRole(p.truth_metadata.value_source_role),
    preliminaryCompilationAllowed,provenance,
    formulaConsumers:consumers.formulaConsumers[p.parameter_id],resourceBranchConsumers:consumers.resourceConsumers[p.parameter_id]};
    // Actual server wire preserves its legacy guide-role alias. Exercise that
    // raw shape directly without asserting it is a typed catalog DTO.
    const rawWireSchema={...schema,guide:{...schema.guide,sourceRole:rawGuide.source_role}};
    for(const predicate of [isCanonicalEstimateConsumerSuppliedParameter,isCanonicalEstimateSourceManagedParameter]){
      const rawDecision:unknown=Reflect.apply(predicate,undefined,[rawWireSchema]);
      assert.equal(rawDecision,predicate(schema),'RAW_AND_NORMALIZED_OWNERSHIP_MUST_MATCH:'+p.parameter_id);
    }
    return schema;});
}
const keys:readonly FacadeGlassWholeMethodKeyR4[]=['stick','structural','semi-structural','unitized','point-fixed'];
describe('facade consumer geometry and existing source-readback ownership R5, execution UNRUN',()=>{
  for(const key of keys)test(key+' uses existing canonical UI ownership:1geometry, no BOM/PPR/norm questions',()=>{
    const schemas=consumerSchemas(facadeGlassWholeDefinitionR4(key));
    assert.deepEqual(schemas.filter(isCanonicalEstimateConsumerSuppliedParameter).map(p=>p.parameterId),[facadeGlassWholePrimaryR4]);
    for(const p of schemas.filter(p=>p.parameterId!==facadeGlassWholePrimaryR4))assert.equal(isCanonicalEstimateSourceManagedParameter(p),true,p.parameterId);
  });
  test('vacuum source uses1geometry; serial/software/stock are managed source facts',()=>{
    const schemas=consumerSchemas(facadeGlassVacuumWholeDefinitionR5());
    assert.deepEqual(schemas.filter(isCanonicalEstimateConsumerSuppliedParameter).map(p=>p.parameterId),[facadeGlassVacuumPrimaryR5]);
    for(const p of schemas.filter(p=>p.parameterId!==facadeGlassVacuumPrimaryR5))assert(isCanonicalEstimateSourceManagedParameter(p));
  });
  test('internal timber cutting/project import is separate from the enclosing facade form',()=>{
    const schemas=consumerSchemas(facadeBoardWithEndProtectionDefinitionR5());
    assert.deepEqual(schemas.filter(isCanonicalEstimateConsumerSuppliedParameter),[]);
    assert(schemas.every(p=>p.defaultValue===null));
  });
  test('retained existing card exposes only geometry and the existing ready-profile choice',()=>{
    const m=buildMasterFacadeGlassWholeSuccessorR4(masterFacadeGlassRepresentativeR4());
    const allowed=new Set([facadeGlassSelectorR4,facadeGlassWholePrimaryR4,'glazing_area_m2','floors']);
    for(const p of m.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT'))assert(allowed.has(p.parameter_id));
    assert.equal(m.parameters.find(p=>p.parameter_id==='source_prompt')!.truth_metadata.visibility_role,'INTERNAL_ONLY');
    for(const id of ['source_prompt','drawings_or_specification','project_location']){
      const truth=m.parameters.find(p=>p.parameter_id===id)!.truth_metadata;
      assert.equal(truth.value_source_role,'SOURCE_BACKED_PRELIMINARY_PROFILE');
      assert.equal(truth.provenance?.retained_legacy_assumption_only_v1,true);
    }
    const captured=masterFacadeGlassCapturedParentR4();
    assert.equal(captured.parameters.find((p:{parameter_id:string})=>p.parameter_id==='source_prompt').truth_metadata.visibility_role,'USER_INPUT',
      'IMMUTABLE_ORIGINAL_CAPTURE_NOT_REWRITTEN_TO_HIDE_OLD_QUESTION');
  });
  for(const key of keys)test(key+' direct core rejects technical submissions before any wrapper or confirmed merge',async()=>{
    const model=facadeGlassWholeDefinitionR4(key),fixture=facadeGlassWholeControlR4(key);
    const technical='glass_approved_BOM',confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>id!==facadeGlassWholePrimaryR4));
    for(const value of [null,fixture[technical],'replacement'])await assert.rejects(()=>compileCanonicalEstimateCore({
      operation:'compile',compilerVersion:'FACADE_BOUNDARY_TEST_ONLY_R5',catalogId:'canonical-work:expanded:curtain_wall_system',
      primaryMeasureParameterId:facadeGlassWholePrimaryR4,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
      submittedParameters:{[facadeGlassWholePrimaryR4]:'100',[technical]:value},confirmedParameters,
      currencyCode:'KGS',priceItems:[],maximumResourceRows:model.resources.length,hashJson:estimateDeterministicHash,
    }),{code:'PARAMETER_VALIDATION_FAILED'});
  });
  test('existing automatic owner accepts trusted readback while keeping internal norms unresolved',async()=>{
    const model=facadeGlassWholeDefinitionR4('stick'),fixture=facadeGlassWholeControlR4('stick');
    const {[facadeGlassWholePrimaryR4]:geometry,...confirmedParameters}=fixture;
    const result=await compileAutomaticConstructionOwnerR1({compilerVersion:'FACADE_BOUNDARY_TEST_ONLY_R5',
      catalogId:'canonical-work:expanded:curtain_wall_system',primaryMeasureParameterId:facadeGlassWholePrimaryR4,definition:model,
      submittedParameters:{[facadeGlassWholePrimaryR4]:geometry},confirmedParameters});
    assert.equal(compareFormulaGraphDecimals(result.rows.find(r=>r.row_id===facadeGlassWholePackR4('stick').prefix+':bom:anchors')!.quantity,'48'),0);
    assert(result.preliminaryNeeds.length>0);
    assert(result.preliminaryNeeds.every(n=>n.quantity===null));
  });
  test('TEST_ONLY schedules are excluded by the existing approved-baseline runtime route',()=>{
    for(const key of keys){
      const fixture=facadeGlassWholeControlR4(key);
      assert.deepEqual(canonicalApprovedBaselineRuntimeParameters({input_values:fixture,
        input_classification:Object.fromEntries(Object.keys(fixture).map(id=>[id,'TEST_ONLY']))}),{});
    }
  });
});
